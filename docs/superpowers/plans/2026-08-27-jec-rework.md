# Just Enough Cooks Rework — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework Just Enough Cooks so standard play carries real decisions (Signature nomination, The Crutch, Special Instructions, a staged reveal), replace Kitchen Nightmares with Fusion Cuisine, run a full terminology pass, and give the game its first two verification harnesses.

**Architecture:** JEC is a Phase-22 game — its plugin logic is `js/games/jec.js`, its markup is `index.html`, and its **multiplayer handlers live inline in `js/engine-multiplayer.js` (~lines 1176–1270), not in a `jecHandleEnvelope`**. The plan front-loads pure scoring/deck/vote logic behind a new headless harness (`tools/verify-jec-loop.js`), then stands up a two-device wire harness (`tools/verify-jec-loopback.js`) before any packet is rewritten, then works screen-by-screen with each screen's host/client branch landing in the same task as its markup. Documentation closure is the final task.

**Tech Stack:** Vanilla ES6 globals (no modules, no build step), Tailwind utility classes from the vendored `js/lib/tailwind-play.js`, Firebase RTDB for Lobby Mode, Node `vm` sandboxes for the two harnesses.

**Spec:** `docs/superpowers/specs/2026-08-27-jec-rework-design.md` — read it end to end before Task 1. Every mechanic, scoring value, setting name and copy string in this plan is owner-approved there; this plan does not reopen design.

---

## Global Constraints

Every task's requirements implicitly include this section.

- **Never use the Edit tool for systematic changes to `index.html`.** It produces UTF-8 mojibake in this file. Use a Node script (`node - <<'EOF' … EOF` or a temp script under the scratchpad) that reads the file as `utf8`, does string replacement, and writes back as `utf8`. Single-character surgical edits are still risky — prefer the Node script for **all** `index.html` writes in this plan.
- **Never full-read `index.html`** (~515 KB / ~128k tokens) or `docs/code-map.md` (~132 KB). Grep for the ID, then offset-Read the slice.
- **Firebase erases every empty value.** `null`, `{}` and `[]` are deleted in flight and arrive as `undefined`; `''`, `0` and `false` are safe and never at risk. Use `''` for every absent string. Every array in a packet is **sent explicitly at its reset value and rebuilt on receipt** through a normaliser. Never assign a raw `p.x` collection field.
- **The host must process its own submission directly, never via `mpSendEnvelope`.** `mpHandleEnvelope` drops every envelope where `originId === syllyDeviceUid`. This already bit JEC once (bug J1) and applies identically to the new `jecMpVoteCheck` matrix.
- **`[].every()` is `true`.** Assert every readiness gate in **both** Pass-the-Phone and Lobby Mode (CJAR BUG-05).
- **Every new screen must be added to `allScreens[]` in `js/engine.js`**, or it becomes a ghost screen that never hides. Every new overlay must be added to `resetToLobby()` teardown.
- **Lobby bounds stay constants.** `getMaxPlayers: () => 6` / `getMinPlayers: () => 3` in `MP_GAME_CONFIGS`. Nothing in this rework may make a bound read game-local setup state.
- **Motion Standard:** animate `transform`/`opacity` only, ≤ 300 ms per row, 30–80 ms stagger. New markup names its transition property (`transition-transform`, `transition-opacity`) — never `transition-all`.
- **Australian spelling mandatory** (colour, flavour, savoury, barbecue); metric units only. Slang is dialled back this pass: *servo* → **petrol station**, *barbie* → **barbecue**.
- **Action buttons carry no emoji on the label** and must be brand amber (`bg-amber-500 hover:bg-amber-600`), neutral stone, or semantic red. Icon-only utility buttons (🔊 ✕ ?) keep their glyphs.
- **Brand:** amber-500. Pills `pill-active-amber`. Toggle ON `game-toggle-on-amber`, OFF `game-toggle-off`. Modal border `border-amber-300`.
- **Run after every task that touches its area:** `node tools/verify-jec-loop.js`, `node tools/verify-jec-loopback.js`, `node tools/verify-mp-configs.js`, `node tools/verify-identity-docs.js`.

### Naming decisions (settled here — do not re-derive per task)

**Rename any variable whose name references a retired term. Keep any variable whose name is still accurate.**

| Old | New | Why |
|---|---|---|
| `jecKitchenNightmares` | `jecFusionCuisine` | Mode replaced entirely |
| `jecRottenPenalty` | `jecTableForOnePenalty` | "Rotten" is a retired badge |
| `jecSpoiltPenalty` | `jecCrowdedKitchenTax` | "Spoilt" is a retired badge |
| `jecSousChefOversight` | `jecSousChefCheck` | "Oversight" is a retired term |
| `jecPoisons`, `jecPoisonedNorms`, `jecBuildPoisonSet` | *(deleted)* | Poison Word is retired |
| `getIngredientStatus` | `jecBadge` | Returns a badge object now, not a status string |
| `jecRounds` | **unchanged** | A round is still a round; only the *setting label* becomes "Courses" |
| `jecGoldenScore`, `jecFoodDifficulty`, `jecSpecialsBoard` | **unchanged** | Names still accurate |

Renames ripple into four files — `js/games/jec.js`, `js/engine-multiplayer.js` (settings sync at ~840 and ~987, handlers at ~1176), `js/engine.js` (`resetToLobby` teardown ~627–639), and `js/secret-mode.js` (~127–129). Grep before declaring a rename done.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `js/games/jec.js` | All JEC state, settings, scoring, deck, render and listeners (928 lines today) | Heavily modified throughout |
| `js/engine-multiplayer.js` | `MP_GAME_CONFIGS.jec` (~116–130), settings sync (~840, ~987), **all JEC packet handlers inline** (~1176–1270) | Modified |
| `js/engine.js` | `allScreens[]` (~34–36), `resetToLobby()` JEC teardown (~622–639) | Modified |
| `js/secret-mode.js` | JEC Terminal settings readout (~126–130) | Modified — carries a second copy of bug J2 |
| `index.html` | All eight JEC screens + six overlays (~2229–2690) | Heavily modified — **Node script only** |
| `css/styles.css` | `.jec-range` (~531) | Add `.jec-tasting-row` stagger rules |
| `sw.js` | `CACHE_NAME` (currently `sylly-games-v210`) | Bump to v211 |
| `tools/verify-jec-loop.js` | **New** — single-mode rules harness: tiers, Signature, Crutch, instructions deck, Fusion vote | Created Task 1 |
| `tools/verify-jec-loopback.js` | **New** — host↔client over a Firebase-shaped wire with a real mock DOM | Created Task 6 |
| `docs/game-identities/jec.md` | T5/T6/T7a/T7b/T8/T10 | Rewritten Task 14 |
| `docs/code-map.md`, `docs/implementation-notes/jec-implementation-notes.md`, `docs/decision-log.md`, `CLAUDE.md` | Documentation closure | Task 14 |

**No new files in `js/`.** JEC has no render seam, gains no artwork, and gains no `js/lib/` module (spec § 11).

---

## Task 1: `verify-jec-loop.js` harness rig + tier baseline

The rig every logic task after this one grows. The tier formula is **unchanged** by this rework (spec § 2.6), so these assertions must pass against today's shipped `js/games/jec.js` — that is what proves the rig loads and drives real code rather than a stub.

**Files:**
- Create: `tools/verify-jec-loop.js`

**Interfaces:**
- Consumes: `js/games/jec.js` globals `jecCalcPoints`, `jecGoldenScore`, `jecPlayerCount` (loaded into a `vm` sandbox).
- Produces: for later tasks — the sandbox contract (`sandbox.allWords`, `sandbox.loadWords`, `sandbox.normaliseWord`, `sandbox.shuffle`), the `globalThis.__jec` bridge object, and the `check(label, actual, expected)` assertion helper. Every later logic task appends sections to this file and reuses these.

**Gotcha the implementer will hit:** `js/games/jec.js` declares its state with top-level `let`, and reads four globals it does not own — `allWords` and `loadWords()` (from `js/games/li5.js`), and `normaliseWord`/`shuffle` (from `js/engine.js`). All four must be supplied by the sandbox. `jecStartGame()` is `async` and awaits `loadWords()`; supply a resolved-promise stub. The file also registers ~30 `addEventListener` calls at load time against `document.getElementById(...)`, so the mock document must return an object carrying `addEventListener`, or the file throws before a single function is defined.

- [ ] **Step 1: Write the harness rig with the tier assertions**

Create `tools/verify-jec-loop.js`:

```js
// ═══════════════════════════════════════════════════════════════════════════
// verify-jec-loop.js — drives Just Enough Cooks' scoring, deck and vote logic
// headlessly in 'single' mode.
//
//   node tools/verify-jec-loop.js        (exits 1 on any failure)
//   JEC_SRC=/path/to/broken.js node tools/verify-jec-loop.js
//
// Companion to verify-jec-loopback.js (packet layer). This one asserts RULES:
// the tier table at every player count, the Signature double applying to the
// Golden range only, Crutch resolution, the Crutch never entering the frequency
// pool, merge-map resolution, penalty priority, Special Instructions deck
// exhaustion, and Fusion name-vote tallying.
//
// Sandbox rules: mpSendEnvelope THROWS so a leaked broadcast fails loudly in
// single mode. setTimeout is CAPTURED, not fired. shuffle is the identity so
// deck order is deterministic.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT   = path.join(__dirname, '..');
const jecSrc = fs.readFileSync(process.env.JEC_SRC || path.join(ROOT, 'js/games/jec.js'), 'utf8');

// A small deterministic food pool. The real data/words.json is not needed —
// jecBuildFoodPool only reads .category, .difficulty and .word.
const WORDS = [
  { word: 'pizza',    category: 'food', difficulty: 1 },
  { word: 'nachos',   category: 'food', difficulty: 1 },
  { word: 'sushi',    category: 'food', difficulty: 2 },
  { word: 'pho',      category: 'food', difficulty: 2 },
  { word: 'terrine',  category: 'food', difficulty: 3 },
  { word: 'consomme', category: 'food', difficulty: 3 },
];

// ── Mock document ─────────────────────────────────────────────────────────────
// jec.js registers ~30 listeners at load time; every getElementById must return
// an object carrying addEventListener or the file throws before defining anything.
function makeDocument() {
  const byId = {};
  const mk = () => ({
    style: {}, dataset: {}, className: '', textContent: '', value: '',
    disabled: false, placeholder: '', children: [],
    _html: '',
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = String(v); this.children = []; },
    classList: { add() {}, remove() {}, contains: () => false, toggle() {} },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener() {}, removeEventListener() {},
    querySelector: () => null, querySelectorAll: () => [],
  });
  return {
    body: mk(), addEventListener() {}, createElement: mk,
    querySelector: () => null, querySelectorAll: () => [],
    getElementById(id) { return byId[id] || (byId[id] = mk()); },
  };
}

const screens = [];
const timers  = [];
const sandbox = {
  console,
  document: makeDocument(),
  window: { syllyMultiplayerMode: 'single', activeExpansionOverrides: null },
  allWords: WORDS,
  loadWords: () => Promise.resolve(),
  isSecretMode: false,
  secretWords: [],
  // The real normaliseWord from engine.js:844. A stub that only lowercased
  // would silently break every merge and Crutch assertion in this file.
  normaliseWord: w => {
    w = w.toLowerCase().trim();
    if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
    if (w.endsWith('es')  && w.length > 3) return w.slice(0, -2);
    if (w.endsWith('s')   && w.length > 2) return w.slice(0, -1);
    return w;
  },
  shuffle: a => [...a],                       // identity — deterministic decks
  showScreen: id => screens.push(id),
  setTimeout: (fn, ms) => timers.push({ fn, ms }) - 1,
  clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  playLaunch() {}, playWhoosh() {}, playDone() {}, playTick() {}, playBoing() {},
  playAlarm() {}, playSuccess() {}, playExit() {}, playPillClick() {},
  playSyllyOn() {}, playSyllyOff() {},
  mpSendEnvelope() { throw new Error('mpSendEnvelope called in single mode'); },
  mpLockSync() {}, mpUnlockSync() {},
  mpPlayerSlots: [], mpMyPlayerIdx: 0,
  mpNotifyPlayerLeft() {}, mpShowModeScreen() {}, resetToLobby() {},
  activeGameId: null,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

// The bridge exposes jec.js's top-level `let` state, otherwise unreachable
// from outside the vm context.
const BRIDGE = `
globalThis.__jec = {
  get freq()       { return jecWordFrequency; },
  get display()    { return jecDisplayWords; },
  get mergeMap()   { return jecMergeMap; },
  get inputs()     { return jecInputs; },
  get scores()     { return jecScores; },
  get signatures() { return jecSignatures; },
  get count()      { return jecPlayerCount; },
  get golden()     { return jecGoldenScore; },
  points(c, n)     { return jecCalcPoints(c, n); },
  seat(o) {
    jecPlayerCount = o.players;
    jecPlayerNames = o.names || Array.from({ length: o.players }, (_, i) => 'Chef ' + (i + 1));
    jecScores      = Array(o.players).fill(0);
    jecGoldenScore = o.golden === undefined ? 30 : o.golden;
    jecRounds      = o.rounds === undefined ? 3 : o.rounds;
  },
};
`;
vm.runInContext(jecSrc + BRIDGE, sandbox);
const J = sandbox.__jec;

// ── Assertions ────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.error('FAIL  ' + label + '\n        expected ' + e + '\n        actual   ' + a); }
}

// ── § 1 Tier table (spec § 2.6) ───────────────────────────────────────────────
// Unchanged by this rework — these must be green against shipped jec.js.
J.seat({ players: 4, golden: 30 });
check('N=4 count 1 -> 0',      J.points(1, 4), 0);
check('N=4 count 2 -> golden', J.points(2, 4), 30);
check('N=4 count 3 -> half',   J.points(3, 4), 15);
check('N=4 count 4 -> token',  J.points(4, 4), 5);   // round(30 * 0.15)

// 3 players is deliberately binary: jackpot then token, no Crowd-Pleaser band.
check('N=3 count 2 -> golden', J.points(2, 3), 30);
check('N=3 count 3 -> token',  J.points(3, 3), 5);

// The Crowd-Pleaser band is deliberately FLAT at 6 players.
check('N=6 count 3 -> half',   J.points(3, 6), 15);
check('N=6 count 5 -> half',   J.points(5, 6), 15);
check('N=6 count 6 -> token',  J.points(6, 6), 5);

// The Sweet Spot setting scales every band.
J.seat({ players: 4, golden: 10 });
check('golden=10 count 2', J.points(2, 4), 10);
check('golden=10 count 3', J.points(3, 4), 5);
check('golden=10 count 4', J.points(4, 4), 2);   // round(10 * 0.15) = 2

console.log('\njec-loop: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run it and confirm it passes against shipped code**

Run: `node tools/verify-jec-loop.js`
Expected: `jec-loop: 12 passed, 0 failed`, exit 0.

If it throws at `vm.runInContext`, a sandbox global is missing — read the thrown identifier and add it to `sandbox`. Do **not** work around a throw by wrapping it in try/catch.

- [ ] **Step 3: Prove the harness can fail**

Run: `JEC_SRC=/dev/null node tools/verify-jec-loop.js`
Expected: a thrown `ReferenceError` (nothing is defined) and a non-zero exit. This confirms `JEC_SRC=` is wired and the harness really is reading the file rather than passing vacuously.

- [ ] **Step 4: Commit**

```bash
git add tools/verify-jec-loop.js
git commit -m "test(jec): add verify-jec-loop harness rig with tier baseline

JEC has shipped since Phase 22 with no verification harness at all. This is the
rig the rework's scoring, deck and vote assertions grow into; the tier formula
is unchanged by the rework, so these 12 checks are green on current main."
```

---

## Task 2: Scoring core — Signature nomination, badge object, state swap

Replaces the `'Rotten' | 'Golden' | 'Spoilt'` status string with a four-way badge object matching the four named badges, promotes Signature Dish to standard mode as a real nomination, fixes the Signature double to apply to the **Golden range only**, and removes every trace of the Poison Word.

**Files:**
- Modify: `js/games/jec.js` — state block (~9–37), `getIngredientStatus` (~417), `jecCalcPoints` (~424), `jecBuildPoisonSet` (~431, delete), `jecCalcRoundScores` (~595), `jecResetForNewGame` (~712)
- Modify: `js/engine.js:622-639` — `resetToLobby()` teardown
- Modify: `js/engine-multiplayer.js:841-842, 990-993, 1183-1240` — renames + deleted globals
- Modify: `js/secret-mode.js:126-130`
- Test: `tools/verify-jec-loop.js` — append § 2

**Interfaces:**
- Consumes: `check()`, `J.seat()` from Task 1.
- Produces:
  - `jecBadge(count, N)` → `{ key, label, cls }`, `key` ∈ `'alone' | 'kiss' | 'crowd' | 'toomany'`
  - `jecIsGolden(key)` → `boolean` — true for `'kiss'` and `'crowd'`. **This is the spec's "Golden range" and the only thing the Signature double may test.**
  - `jecBonusValue()` → `number` — `round(jecGoldenScore * 0.5)`; the single magnitude behind all three bonuses
  - `jecResolveNorm(raw)` → `string` — normalises then walks `jecMergeMap` (max 10 hops)
  - `jecCalcRoundScores()` → `{ roundScores: number[], bonus: Array<{signature:number, crutch:number, name:number}> }` — **the return shape changes from a bare array**; Task 12 renders `bonus`, Task 6 wires it
  - State: `jecSignatures` (int[N], `-1` = unset), `jecCrutches` (string[N], `''` fill), `jecTableForOnePenalty`, `jecCrowdedKitchenTax`, `jecSousChefCheck`, `jecFusionCuisine`
  - Deleted: `jecPoisons`, `jecPoisonedNorms`, `jecBuildPoisonSet`, `getIngredientStatus`

- [ ] **Step 1: Extend the bridge and write the failing assertions**

Add these members to the `BRIDGE` template string in `tools/verify-jec-loop.js`, inside the `globalThis.__jec = {` object above `seat(o)`:

```js
  badge(c, n) { return jecBadge(c, n); },
  isGolden(k) { return jecIsGolden(k); },
  last()      { return globalThis.__jecLast; },
  // Drives one complete round through the SHIPPED functions: seats the table,
  // sets the settings, loads the inputs, builds the frequency pool, applies any
  // merges, then scores.
  round(o) {
    jecPlayerCount        = o.players;
    jecPlayerNames        = Array.from({ length: o.players }, (_, i) => 'Chef ' + (i + 1));
    jecScores             = Array(o.players).fill(0);
    jecGoldenScore        = o.golden === undefined ? 30 : o.golden;
    jecTableForOnePenalty = !!o.tableForOne;
    jecCrowdedKitchenTax  = !!o.crowdedKitchenTax;
    jecFusionCuisine      = !!o.fusion;
    jecCurrentWord        = o.word  || 'pizza';
    jecCurrentWord2       = o.word2 || '';
    jecInstruction        = o.instruction || '';
    jecRoundLog           = [];
    jecInputs      = o.inputs.map(a => [...a]);
    jecSignatures  = o.signatures ? [...o.signatures] : Array(o.players).fill(-1);
    jecCrutches    = o.crutches   ? [...o.crutches]   : Array(o.players).fill('');
    jecFusionNames = o.names      ? [...o.names]      : Array(o.players).fill('');
    jecNameVotes   = o.votes      ? [...o.votes]      : Array(o.players).fill(-1);
    jecBuildFrequency();
    (o.merges || []).forEach(m => jecApplyMerge(normaliseWord(m[0]), normaliseWord(m[1])));
    globalThis.__jecLast = jecCalcRoundScores();
    return globalThis.__jecLast;
  },
```

Then append § 2 immediately above the final `console.log`:

```js
// ── § 2 Badges, Signature nomination, penalty priority ────────────────────────
J.seat({ players: 4, golden: 30 });
check('badge alone',   J.badge(1, 4).key, 'alone');
check('badge kiss',    J.badge(2, 4).key, 'kiss');
check('badge crowd',   J.badge(3, 4).key, 'crowd');
check('badge toomany', J.badge(4, 4).key, 'toomany');
check('label alone',   J.badge(1, 4).label, 'Table for One 🍽️');
check('label kiss',    J.badge(2, 4).label, "Chef's Kiss ✨");
check('label crowd',   J.badge(3, 4).label, 'Crowd-Pleaser 👌');
check('label toomany', J.badge(4, 4).label, 'Too Many Cooks! 🍲');

// The Golden range is exactly Chef's Kiss + Crowd-Pleaser — the ONLY thing the
// Signature double may key off. The shipped code doubled any positive score,
// including the Too Many Cooks token, against what the identity doc describes.
check('golden range kiss',    J.isGolden('kiss'),    true);
check('golden range crowd',   J.isGolden('crowd'),   true);
check('golden range alone',   J.isGolden('alone'),   false);
check('golden range toomany', J.isGolden('toomany'), false);

// Signature doubles a Chef's Kiss. Chef 0: cheese(x2 kiss, nominated) + basil(1) + olive(1).
J.round({
  players: 4, golden: 30,
  inputs: [['cheese', 'basil', 'olive'], ['cheese', 'ham', 'rocket'],
           ['anchovy', 'caper', 'crust'], ['pine', 'fig', 'honey']],
  signatures: [0, 0, 0, 0],
});
check('sig doubles a kiss',  J.last().roundScores[0], 60);
check('sig bonus recorded',  J.last().bonus[0].signature, 30);

// Signature does NOT double a Too Many Cooks token.
J.round({
  players: 3, golden: 30,
  inputs: [['salt', 'a1', 'a2'], ['salt', 'b1', 'b2'], ['salt', 'c1', 'c2']],
  signatures: [0, 0, 0],
});
check('sig does not double token', J.last().roundScores[0], 5);
check('sig bonus zero on token',   J.last().bonus[0].signature, 0);

// Signature does NOT rescue a Table for One, and costs nothing extra when it fails.
// Chef 0: lonely(1, nominated, penalty −5) + salt(3 of 3 = token +5) + x1(1, −5).
J.round({
  players: 3, golden: 30, tableForOne: true,
  inputs: [['lonely', 'salt', 'x1'], ['salt', 'y1', 'y2'], ['salt', 'z1', 'z2']],
  signatures: [0, 1, 1],
});
check('failed sig takes the penalty once', J.last().roundScores[0], -5 + 5 - 5);
check('sig bonus zero on table-for-one',   J.last().bonus[0].signature, 0);

// Penalties REPLACE the tier reward, never stack with it.
// Chef 0: salt(4 of 4 -> tax −8) + a1(1, no penalty set) + a2(1).
J.round({
  players: 4, golden: 30, crowdedKitchenTax: true,
  inputs: [['salt', 'a1', 'a2'], ['salt', 'b1', 'b2'],
           ['salt', 'c1', 'c2'], ['salt', 'd1', 'd2']],
  signatures: [1, 1, 1, 1],
});
check('crowded tax replaces token', J.last().roundScores[0], -8);

// A signature index of −1 (unset — a dropped packet) is inert and never throws.
J.round({
  players: 3, golden: 30,
  inputs: [['cheese', 'a1', 'a2'], ['cheese', 'b1', 'b2'], ['c0', 'c1', 'c2']],
  signatures: [-1, -1, -1],
});
check('unset signature is inert', J.last().bonus[0].signature, 0);
```

- [ ] **Step 2: Run to verify it fails**

Run: `node tools/verify-jec-loop.js`
Expected: `ReferenceError: jecBadge is not defined` thrown while evaluating the bridge. That is the correct red state.

- [ ] **Step 3: Rewrite the state block in `js/games/jec.js`**

Replace lines 8–37 (the `// ── JEC Settings` and `// ── JEC State` blocks) with:

```js
// ── JEC Settings ──────────────────────────────────────────────────────────────
let jecRounds              = 3;      // Courses: 3 | 5 | 10  (variable name kept — a round is a round)
let jecGoldenScore         = 30;     // The Sweet Spot jackpot: 10 | 20 | 30. Also sets all three bonuses.
let jecTableForOnePenalty  = false;  // opt-in: −5 pts for a Table for One ingredient
let jecCrowdedKitchenTax   = false;  // opt-in: −2 × count for a Too Many Cooks ingredient
let jecSousChefCheck       = true;   // gates the blind Sous Chef's Check sub-state
let jecFusionCuisine       = false;  // Sylly Mode
let jecFoodDifficulty      = 'mixed';// The Menu: 'easy' | 'mixed' | 'hard'
let jecSpecialsBoard       = false;  // allow rerolling the Order (and its Instruction) before prep
let jecSpecialInstructions = false;  // modify Today's Order with one Special Instruction

// ── JEC State ─────────────────────────────────────────────────────────────────
let jecPlayerCount   = 4;
let jecPlayerNames   = [];
let jecRound         = 0;
let jecScores        = [];
let jecCurrentWord   = '';
let jecCurrentWord2  = '';    // Fusion Cuisine's second Order; '' otherwise
let jecInstruction   = '';    // the Special Instruction for this Order; '' when OFF
let jecInstructionDeck = [];  // shuffled JEC_INSTRUCTIONS, popped per Order
let jecWordPool      = [];
let jecInputs        = [];
let jecSignatures    = [];    // [playerIdx] → nominated ingredient index 0/1/2; −1 = unset
let jecCrutches      = [];    // [playerIdx] → the called Crutch word; '' = none
let jecFusionNames   = [];    // [playerIdx] → fused-dish name; '' = none (Fusion only)
let jecNameVotes     = [];    // [playerIdx] → voted-for playerIdx; −1 = not yet voted
let jecNameWinners   = [];    // playerIdx[] — every tied top-voted name
let jecWordFrequency = {};    // normalised word → count
let jecDisplayWords  = {};    // normalised word → first raw input for display
let jecMergeMap      = {};    // normalised word → merged-into target word
let jecRoundLog      = [];    // [{ order, order2, instruction, scores }]
let jecCurrentPlayerIdx  = 0; // which Chef is currently prepping (Pass-the-Phone)
let jecVoteCurrentIdx    = 0; // which Chef is currently voting (Pass-the-Phone)
let jecSiftingSubState   = 'check';  // 'check' (blind merge) | 'tasting' (scored reveal)
let jecOversightSelected = null;
let jecOversightPendingA = null;
let jecOversightPendingB = null;
let jecPrepSignatureIdx  = -1;       // the tap-selected Signature on the live prep screen
let jecMpReadyCheck      = [];       // Lobby Mode: which Chefs have submitted prep
let jecMpVoteCheck       = [];       // Lobby Mode: which Chefs have submitted a name vote
```

- [ ] **Step 4: Replace `getIngredientStatus` with `jecBadge` + helpers**

Replace lines 417–437 (`getIngredientStatus`, `jecCalcPoints`, `jecBuildPoisonSet`) with:

```js
// One badge object per count. The four keys map 1:1 to the four named badges,
// which is what lets the Signature double test the GOLDEN RANGE rather than
// "any positive score" — the shipped code doubled the Too Many Cooks token too,
// against what the identity doc has always described.
function jecBadge(count, N) {
  if (count <= 1)  return { key: 'alone',   label: 'Table for One 🍽️', cls: 'bg-stone-50 text-stone-400' };
  if (count === 2) return { key: 'kiss',    label: "Chef's Kiss ✨",    cls: 'bg-amber-100 text-amber-700' };
  if (count < N)   return { key: 'crowd',   label: 'Crowd-Pleaser 👌',  cls: 'bg-amber-50 text-amber-600' };
  return             { key: 'toomany', label: 'Too Many Cooks! 🍲', cls: 'bg-stone-100 text-stone-500' };
}

// The Golden range = Chef's Kiss + Crowd-Pleaser. The Signature double applies
// here and nowhere else.
function jecIsGolden(key) { return key === 'kiss' || key === 'crowd'; }

// Tiered positive rewards — a 2-Chef match is the jackpot.
function jecCalcPoints(count, N) {
  if (count <= 1)  return 0;
  if (count === 2) return jecGoldenScore;
  if (count < N)   return Math.round(jecGoldenScore * 0.5);
  return             Math.round(jecGoldenScore * 0.15);
}

// Every flat bonus in the game is this one number — half a jackpot. Called It!
// and On the Menu! both pay it, so the game carries one bonus magnitude rather
// than three magic numbers.
function jecBonusValue() { return Math.round(jecGoldenScore * 0.5); }

// Normalise, then walk the merge map to the surviving word. Shared by ingredient
// scoring AND Crutch resolution — a Sous Chef merge must apply to both.
function jecResolveNorm(raw) {
  let norm  = normaliseWord(String(raw || '').trim());
  let steps = 0;
  while (jecMergeMap[norm] && steps < 10) { norm = jecMergeMap[norm]; steps++; }
  return norm;
}
```

- [ ] **Step 5: Rewrite `jecCalcRoundScores`**

Replace the whole function (~595–623) with:

```js
// ── JEC Round scoring ─────────────────────────────────────────────────────────
// Returns { roundScores, bonus } — bonus[p] = { signature, crutch, name }, the
// per-Chef breakdown The Tally renders and JEC_TALLY carries to clients.
// The crutch and name fields stay 0 until Tasks 3 and 5 fill them.
function jecCalcRoundScores() {
  const roundScores = Array(jecPlayerCount).fill(0);
  const bonus = Array.from({ length: jecPlayerCount },
    () => ({ signature: 0, crutch: 0, name: 0 }));

  for (let p = 0; p < jecPlayerCount; p++) {
    for (let j = 0; j < jecInputs[p].length; j++) {
      const norm  = jecResolveNorm(jecInputs[p][j]);
      const count = jecWordFrequency[norm] || 0;
      const badge = jecBadge(count, jecPlayerCount);

      // Opt-in penalties REPLACE the tier reward for that count; they never stack.
      if (badge.key === 'alone' && jecTableForOnePenalty)   { roundScores[p] -= 5; continue; }
      if (badge.key === 'toomany' && jecCrowdedKitchenTax)  { roundScores[p] -= count * 2; continue; }

      const pts = jecCalcPoints(count, jecPlayerCount);
      if (pts <= 0) continue;
      roundScores[p] += pts;
      // The Signature double — GOLDEN RANGE ONLY. A nominated ingredient landing
      // Table for One or Too Many Cooks scores its normal value; the loss is the
      // double you did not get, not an extra penalty.
      if (jecSignatures[p] === j && jecIsGolden(badge.key)) {
        roundScores[p]     += pts;
        bonus[p].signature += pts;
      }
    }
  }

  jecRoundLog.push({
    order: jecCurrentWord, order2: jecCurrentWord2,
    instruction: jecInstruction, scores: [...roundScores],
  });
  for (let p = 0; p < jecPlayerCount; p++) jecScores[p] += roundScores[p];
  return { roundScores, bonus };
}
```

- [ ] **Step 6: Purge the Poison Word from every call site**

`js/games/jec.js`:
- `jecStartRound` (~265) — replace the `if (jecKitchenNightmares) { … }` block with unconditional resets:
  ```js
  jecSignatures  = Array(jecPlayerCount).fill(-1);
  jecCrutches    = Array(jecPlayerCount).fill('');
  jecFusionNames = Array(jecPlayerCount).fill('');
  jecNameVotes   = Array(jecPlayerCount).fill(-1);
  jecNameWinners = [];
  jecMpVoteCheck = Array(jecPlayerCount).fill(false);
  ```
- `jecStartSifting` (~439) — delete the `jecBuildPoisonSet()` call and the whole `jec-sifting-poison-section` block (~443–463). The Callouts replace it in Task 10.
- `jecRenderSifting` (~470) — delete `isPoisoned`, the `'Poisoned'` branch and the `statusOrder` map. Task 10 rewrites this function entirely; for now sort by `b[1] - a[1]` and render from `jecBadge(count, jecPlayerCount)` (`.label` and `.cls`).
- `jecApplyMerge` (~566) — delete the poison-propagation block and drop `jecPoisonedNorms` from the `JEC_MERGE` payload. **Keep** the "swap so the ingredient wins" guard at the top; Task 3 extends it for Crutch-only words.
- `jecResetForNewGame` (~712) — swap the deleted variables for the new state list.
- `jecApplyExpansionOverrides` (~915) — rename the three override keys.
- Every `jecSubmitIngredients` reference to `jecKitchenNightmares` / poison (~333–345, ~373–384) — delete for now; Task 9 rewrites this function.

`js/engine.js` ~622–639 — replace the JEC teardown block with the new variable list (drop `jecPoisons`, `jecPoisonedNorms`; add `jecCurrentWord2`, `jecInstruction`, `jecCrutches`, `jecFusionNames`, `jecNameVotes`, `jecNameWinners`, `jecMpVoteCheck`, and reset `jecSiftingSubState = 'check'`, `jecVoteCurrentIdx = 0`, `jecPrepSignatureIdx = -1`). Also add the overlay teardown line that is **missing today** — `jec-help-tip-overlay` has zero occurrences in `js/engine.js`:

```js
  document.getElementById('jec-help-tip-overlay').style.display    = 'none';
```

`js/engine-multiplayer.js` — apply the four setting renames at 841–842 and 990–993, and delete the `jecPoisons`/`jecPoisonedNorms` lines from the inline handlers at 1183–1185, 1195–1197, 1204, 1211–1212, 1227–1228 and 1240. Task 6 rewrites those handlers properly; here, just make the file parse and stop referencing deleted globals.

`js/secret-mode.js` 126–130 — rename the keys and **fix the second copy of bug J2** (it reads `−10 pts` for both penalties; the real values are −5 and −2 × count):

```js
  jec: [
    { key: 'jecRounds',             label: 'Courses',         fmt: v => String(v) },
    { key: 'jecTableForOnePenalty', label: 'Table for One',   fmt: v => v ? '−5 pts' : 'Off' },
    { key: 'jecCrowdedKitchenTax',  label: 'Crowded Kitchen', fmt: v => v ? '−2 per Chef' : 'Off' },
    { key: 'jecFusionCuisine',      label: 'Sylly Mode',      fmt: v => v ? 'ON' : 'OFF' },
  ],
```

- [ ] **Step 7: Run to verify it passes**

Run: `node tools/verify-jec-loop.js`
Expected: `jec-loop: 33 passed, 0 failed`, exit 0.

Then confirm nothing anywhere still references a deleted global:

Run: `grep -rn "jecPoison\|jecKitchenNightmares\|jecRottenPenalty\|jecSpoiltPenalty\|jecSousChefOversight\|getIngredientStatus" --include=*.js --include=*.html .`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add tools/verify-jec-loop.js js/games/jec.js js/engine.js js/engine-multiplayer.js js/secret-mode.js
git commit -m "feat(jec): promote Signature Dish to standard play; retire Poison Word

Signature nomination becomes a real per-round choice and its double now applies
to the Golden range only (Chef's Kiss or Crowd-Pleaser). The shipped code
doubled any positive score including the Too Many Cooks token, against what the
identity doc has always described.

The four-way jecBadge object replaces the three-way status string so the Golden
range is expressible at all. Poison Word and every trace of it are gone. Also
fixes the second copy of bug J2, in secret-mode.js, which read -10 pts for both
penalties when the real values are -5 and -2 per Chef."
```

---

## Task 3: The Crutch — resolution, the never-in-pool invariant, merge-map parity

The Crutch replaces the Poison Word in the same input field, inverted into a read of the table. It pays a flat half-jackpot when the called word is at the round's **top count** *and* that count is **≥ 3**. Ties all pay. A miss costs nothing.

**The load-bearing invariant: the Crutch never enters the frequency pool.** It is a prediction, not a submission. A Crutch that counted would let a Chef manufacture a Crowd-Pleaser for themselves — and at a 3-player table a single counted Crutch is the difference between a jackpot and a token for everyone who wrote that word.

**Files:**
- Modify: `js/games/jec.js` — `jecBuildFrequency` (~403), `jecApplyMerge` (~566), `jecCalcRoundScores`
- Test: `tools/verify-jec-loop.js` — append § 3

**Interfaces:**
- Consumes: `jecResolveNorm`, `jecBonusValue`, `jecCalcRoundScores` from Task 2.
- Produces:
  - `jecTopCount()` → `number` — the highest value in `jecWordFrequency`; `0` when the pool is empty
  - `jecCrutchHit(p)` → `boolean` — Chef `p`'s Crutch resolves through the merge map to a word at top count with count ≥ 3
  - `bonus[p].crutch` is now populated by `jecCalcRoundScores`

- [ ] **Step 1: Extend the bridge and write the failing assertions**

Add to the `BRIDGE` object in `tools/verify-jec-loop.js`:

```js
  topCount()   { return jecTopCount(); },
  crutchHit(p) { return jecCrutchHit(p); },
```

Append § 3 above the final `console.log`:

```js
// ── § 3 The Crutch ────────────────────────────────────────────────────────────
// Pays jecBonusValue() when the called word is at the round's TOP count AND
// that count is >= 3. Ties all pay. A miss costs nothing.

// 4 Chefs. cheese appears 3x (top count 3, >= 3). Chef 3 called it.
J.round({
  players: 4, golden: 30,
  inputs: [['cheese', 'a1', 'a2'], ['cheese', 'b1', 'b2'],
           ['cheese', 'c1', 'c2'], ['d0', 'd1', 'd2']],
  crutches: ['', '', '', 'cheese'],
});
check('top count is 3',        J.topCount(), 3);
check('crutch hit at top >=3', J.crutchHit(3), true);
check('crutch pays half',      J.last().bonus[3].crutch, 15);
check('non-caller gets none',  J.last().bonus[0].crutch, 0);

// Top count of 2 is NOT enough — the >= 3 floor is what stops a 3-player table
// paying out on every ordinary Chef's Kiss.
J.round({
  players: 4, golden: 30,
  inputs: [['cheese', 'a1', 'a2'], ['cheese', 'b1', 'b2'],
           ['c0', 'c1', 'c2'], ['d0', 'd1', 'd2']],
  crutches: ['', '', '', 'cheese'],
});
check('top count 2 is a miss', J.crutchHit(3), false);
check('miss pays nothing',     J.last().bonus[3].crutch, 0);

// A correct word that is NOT at top count is a miss.
J.round({
  players: 5, golden: 30,
  inputs: [['cheese', 'ham', 'a2'], ['cheese', 'ham', 'b2'], ['cheese', 'ham', 'c2'],
           ['cheese', 'd1', 'd2'],  ['ham', 'e1', 'e2']],
  crutches: ['', '', '', '', 'ham'],   // ham = 4, cheese = 4 -> tie at top
});
check('tie at top: both pay', J.crutchHit(4), true);

// Ties all pay: two Chefs calling two DIFFERENT words that share the top count.
J.round({
  players: 6, golden: 20,
  inputs: [['cheese', 'ham', 'a2'], ['cheese', 'ham', 'b2'], ['cheese', 'ham', 'c2'],
           ['d0', 'd1', 'd2'], ['e0', 'e1', 'e2'], ['f0', 'f1', 'f2']],
  crutches: ['', '', '', 'cheese', 'ham', 'sardine'],
});
check('tie payer A', J.last().bonus[3].crutch, 10);
check('tie payer B', J.last().bonus[4].crutch, 10);
check('tie misser',  J.last().bonus[5].crutch, 0);

// THE INVARIANT: the Crutch must never enter the frequency pool.
// If it did, "cheese" below would read 3 (2 written + 1 called) and every Chef
// who wrote it would drop from Chef's Kiss to Crowd-Pleaser.
J.round({
  players: 4, golden: 30,
  inputs: [['cheese', 'a1', 'a2'], ['cheese', 'b1', 'b2'],
           ['c0', 'c1', 'c2'], ['d0', 'd1', 'd2']],
  crutches: ['', '', 'cheese', 'cheese'],
});
check('crutch is not in the pool',  J.freq[J.norm('cheese')], 2);
check('crutch cannot manufacture',  J.last().roundScores[0], 30);   // still a Chef's Kiss

// A Crutch word nobody wrote does not appear in the pool at all.
J.round({
  players: 3, golden: 30,
  inputs: [['a0', 'a1', 'a2'], ['b0', 'b1', 'b2'], ['c0', 'c1', 'c2']],
  crutches: ['vegemite', '', ''],
});
check('uncalled crutch word absent', J.freq[J.norm('vegemite')], undefined);

// The Crutch resolves THROUGH the merge map, exactly as an ingredient does.
// "tomatoe" is merged into "tomato"; a Crutch calling "tomatoe" must still hit.
J.round({
  players: 4, golden: 30,
  inputs: [['tomato', 'a1', 'a2'], ['tomato', 'b1', 'b2'],
           ['tomatoe', 'c1', 'c2'], ['d0', 'd1', 'd2']],
  merges: [['tomato', 'tomatoe']],
  crutches: ['', '', '', 'tomatoe'],
});
check('merged pool count',      J.freq[J.norm('tomato')], 3);
check('crutch follows a merge', J.crutchHit(3), true);

// Merging TWO Crutch-only words (neither in the pool) is a no-op, not a throw.
J.round({
  players: 3, golden: 30,
  inputs: [['a0', 'a1', 'a2'], ['b0', 'b1', 'b2'], ['c0', 'c1', 'c2']],
  merges: [['vegemite', 'vegimite']],
  crutches: ['vegemite', '', ''],
});
check('crutch-only merge is inert', J.crutchHit(0), false);

// An empty Crutch (a Chef who did not call, or a dropped packet) never hits.
J.round({
  players: 4, golden: 30,
  inputs: [['cheese', 'a1', 'a2'], ['cheese', 'b1', 'b2'],
           ['cheese', 'c1', 'c2'], ['d0', 'd1', 'd2']],
  crutches: ['', '', '', ''],
});
check('empty crutch never hits', J.crutchHit(0), false);
check('empty crutch pays zero',  J.last().bonus[0].crutch, 0);
```

Also add a `norm` passthrough to the bridge so the assertions can key into `jecWordFrequency`:

```js
  norm(w) { return normaliseWord(w); },
```

- [ ] **Step 2: Run to verify it fails**

Run: `node tools/verify-jec-loop.js`
Expected: `ReferenceError: jecTopCount is not defined`.

- [ ] **Step 3: Add `jecTopCount` and `jecCrutchHit`**

Insert into `js/games/jec.js` directly below `jecResolveNorm`:

```js
// The round's highest ingredient count. 0 when nothing was written.
function jecTopCount() {
  const counts = Object.values(jecWordFrequency);
  return counts.length ? Math.max(...counts) : 0;
}

// A Crutch hits when the called word is at the round's TOP count AND that count
// is at least 3. "Top count, >= 3 Chefs" has exactly one right-ish answer at any
// player count, where a literal all-N target would be common at 3 Chefs and rare
// at 6. It also gives Too Many Cooks a purpose it has never had: one Chef is
// hunting the very thing everyone else is avoiding.
function jecCrutchHit(p) {
  const raw = (jecCrutches[p] || '').trim();
  if (!raw) return false;
  const top = jecTopCount();
  if (top < 3) return false;
  return (jecWordFrequency[jecResolveNorm(raw)] || 0) === top;
}
```

- [ ] **Step 4: Protect the never-in-pool invariant at its source**

`jecBuildFrequency` (~403) already reads only `jecInputs.flat()`, so the invariant holds by construction today. **Make that explicit rather than incidental** — add the comment, because the next person adding a field to the round is one `.concat(jecCrutches)` away from breaking it silently:

```js
function jecBuildFrequency() {
  jecWordFrequency = {};
  jecDisplayWords  = {};
  jecMergeMap      = {};
  jecOversightSelected = null;
  // ONLY jecInputs. The Crutch is a prediction, not a submission — a Crutch that
  // counted would let a Chef manufacture a Crowd-Pleaser for themselves, and at a
  // 3-player table it is the difference between a jackpot and a token for every
  // Chef who wrote that word. Never add another source to this loop.
  jecInputs.flat().forEach(raw => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const norm = normaliseWord(trimmed);
    jecWordFrequency[norm] = (jecWordFrequency[norm] || 0) + 1;
    if (!jecDisplayWords[norm]) jecDisplayWords[norm] = trimmed;
  });
}
```

- [ ] **Step 5: Make `jecApplyMerge` record a Crutch-only merge**

`jecApplyMerge` currently returns early when neither word is in the frequency pool. That early return is correct for the counts, but it must still record the mapping so a Crutch calling the losing spelling resolves. Replace the guard at the top of the function with:

```js
function jecApplyMerge(normA, normB) {
  if (normA === normB) return;
  // If normA is not an ingredient but normB is, swap so the ingredient survives.
  if (!jecWordFrequency[normA] && jecWordFrequency[normB]) { const t = normA; normA = normB; normB = t; }
  // Neither is in the pool — both are Crutch-only words. Record the mapping so a
  // Crutch calling the losing spelling still resolves, but touch no counts.
  if (!jecWordFrequency[normA] && !jecWordFrequency[normB]) { jecMergeMap[normB] = normA; return; }
  jecWordFrequency[normA] = (jecWordFrequency[normA] || 0) + (jecWordFrequency[normB] || 0);
  jecMergeMap[normB]      = normA;
  jecDisplayWords[normA]  = `${jecDisplayWords[normA] || normA} / ${jecDisplayWords[normB] || normB}`;
  delete jecWordFrequency[normB];
  delete jecDisplayWords[normB];

  if (window.syllyMultiplayerMode === 'host') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'JEC_MERGE',
      jecWordFrequency: { ...jecWordFrequency },
      jecDisplayWords:  { ...jecDisplayWords },
      jecMergeMap:      { ...jecMergeMap },
    }});
  }
}
```

- [ ] **Step 6: Pay the Crutch in `jecCalcRoundScores`**

Insert directly after the `for (let j = …)` ingredient loop closes, still inside the per-Chef loop:

```js
    if (jecCrutchHit(p)) {
      const b = jecBonusValue();
      roundScores[p]  += b;
      bonus[p].crutch  = b;
    }
```

- [ ] **Step 7: Run to verify it passes**

Run: `node tools/verify-jec-loop.js`
Expected: `jec-loop: 51 passed, 0 failed`, exit 0.

- [ ] **Step 8: Commit**

```bash
git add tools/verify-jec-loop.js js/games/jec.js
git commit -m "feat(jec): add The Crutch, replacing the Poison Word

Same input field, inverted into a read of the table: call the ingredient the
kitchen cannot help but reach for. Pays half a jackpot at top count with count
>= 3; ties all pay; a miss costs nothing.

The Crutch never enters the frequency pool - it is a prediction, not a
submission, and one that counted would let a Chef manufacture a Crowd-Pleaser
for themselves. jecBuildFrequency now says so in a comment, and the harness
asserts it directly. The Crutch resolves through the merge map exactly as an
ingredient does, including a merge between two Crutch-only words."
```

---

## Task 4: Special Instructions — the deck

A second deck modifies Today's Order: *Pizza — …at 3am*. One instruction per Order; instructions never stack. The deck is shuffled and popped like the word pool, so a game does not repeat an instruction until it is exhausted. Specials Board rerolls redraw the instruction along with the Order.

**Files:**
- Modify: `js/games/jec.js` — add `JEC_INSTRUCTIONS` + `jecDrawInstruction`; wire into `jecStartGame`, `jecStartRound` and the reroll listener (~841)
- Test: `tools/verify-jec-loop.js` — append § 4

**Interfaces:**
- Consumes: `shuffle` (engine global), `jecSpecialInstructions` (Task 2).
- Produces:
  - `JEC_INSTRUCTIONS` — a frozen 20-string array
  - `jecDrawInstruction()` → sets `jecInstruction`; `''` when the setting is OFF; refills and reshuffles `jecInstructionDeck` when exhausted

- [ ] **Step 1: Extend the bridge and write the failing assertions**

Add to the `BRIDGE` object:

```js
  get instruction()  { return jecInstruction; },
  get instrDeck()    { return jecInstructionDeck; },
  get allInstr()     { return JEC_INSTRUCTIONS; },
  setInstrOn(v)      { jecSpecialInstructions = !!v; },
  resetInstrDeck()   { jecInstructionDeck = []; },
  drawInstruction()  { jecDrawInstruction(); return jecInstruction; },
```

Append § 4:

```js
// ── § 4 Special Instructions deck ─────────────────────────────────────────────
check('twenty instructions',   J.allInstr.length, 20);
check('all instructions unique', new Set(J.allInstr).size, 20);
// Every instruction is a modifier fragment, not a sentence - it renders after
// the Order as "Pizza - ...at 3am".
check('every instruction is an ellipsis fragment',
  J.allInstr.every(s => s.startsWith('…')), true);

// OFF is the default and draws nothing.
J.setInstrOn(false);
J.resetInstrDeck();
check('OFF draws nothing', J.drawInstruction(), '');

// ON pops the deck without repeating until exhaustion.
J.setInstrOn(true);
J.resetInstrDeck();
const drawn = [];
for (let i = 0; i < 20; i++) drawn.push(J.drawInstruction());
check('20 draws, no repeat', new Set(drawn).size, 20);
check('deck is empty after 20', J.instrDeck.length, 0);

// The 21st draw refills rather than returning ''.
const refill = J.drawInstruction();
check('21st draw refills',      refill !== '', true);
check('refill is a real entry', J.allInstr.includes(refill), true);

// Switching the setting OFF mid-game clears the live instruction, so a stale
// line cannot survive on the Order screen.
J.setInstrOn(false);
check('OFF clears the live instruction', J.drawInstruction(), '');
```

- [ ] **Step 2: Run to verify it fails**

Run: `node tools/verify-jec-loop.js`
Expected: `ReferenceError: JEC_INSTRUCTIONS is not defined`.

- [ ] **Step 3: Add the deck**

Insert into `js/games/jec.js` directly below the state block:

```js
// ── JEC Special Instructions ──────────────────────────────────────────────────
// A second deck that modifies Today's Order: "Pizza — …at 3am". One instruction
// per Order; they never stack with each other.
//
// SELECTION CRITERION for any future addition: the instruction must CHANGE THE
// INGREDIENT LIST. A line that is merely funny but leaves the same three answers
// correct does not qualify — "for a picnic" and "for your fussiest mate" were
// drafted and cut on exactly this test.
//
// The real motivation is accessibility, not variety. The repetition complaint is
// only half a vocabulary problem: an instruction gives a Chef an ANGLE to think
// from rather than requiring recipe knowledge. "$5 budget" is answerable by
// anyone. Twenty instructions × ~100 food words ≈ 2,000 prompts.
const JEC_INSTRUCTIONS = Object.freeze([
  // Budget & constraint
  '…on a $5 budget',
  "…using only what's at the petrol station",
  '…in one pan, ten minutes flat',
  '…camping, no power',
  // Occasion
  '…for family dinner',
  '…to impress the in-laws',
  '…as takeaway, before a night out',
  '…for a barbecue in 38° heat',
  '…in a school lunchbox',
  '…to feed twenty people',
  // Standard
  '…going for a Michelin star',
  '…prepared by a five-year-old',
  '…at 3am',
  '…as a hangover cure',
  // Chaos
  "…but it's entirely beige",
  '…but it has to be green',
  '…but make it breakfast',
  '…but make it dessert',
  '…air fryer only',
  '…spicy enough to hurt',
]);

// Pops one instruction, reshuffling a fresh deck when exhausted so a game never
// repeats until it has seen all twenty.
function jecDrawInstruction() {
  if (!jecSpecialInstructions) { jecInstruction = ''; return; }
  if (!jecInstructionDeck.length) jecInstructionDeck = shuffle([...JEC_INSTRUCTIONS]);
  jecInstruction = jecInstructionDeck.pop();
}
```

- [ ] **Step 4: Wire it into the round lifecycle**

- `jecStartGame` (~240) — after `jecWordPool = jecBuildFoodPool(allWords);` add `jecInstructionDeck = [];` so a New Shift starts a fresh deck.
- `jecStartRound` (~251) — call `jecDrawInstruction();` immediately after `jecCurrentWord = jecWordPool.pop();`.
- The reroll listener (~841, `btn-jec-reroll`) — a Specials Board reroll **redraws the instruction along with the Order**. Add `jecDrawInstruction();` after `jecCurrentWord = jecWordPool.pop();` there too, then repaint via the render function Task 8 introduces.

- [ ] **Step 5: Run to verify it passes**

Run: `node tools/verify-jec-loop.js`
Expected: `jec-loop: 60 passed, 0 failed`, exit 0.

- [ ] **Step 6: Commit**

```bash
git add tools/verify-jec-loop.js js/games/jec.js
git commit -m "feat(jec): add the Special Instructions deck (setting, default OFF)

Twenty prompt modifiers across four groups, shuffled and popped per Order so a
game sees all twenty before repeating. A Specials Board reroll redraws the
instruction with the Order.

This attacks the right axis. Menu Complexity made the dish harder, which does
not widen the interesting band - it makes every Chef fail together. An
instruction flattens the head of the answer distribution instead, and gives a
low-vocabulary Chef an angle to think from rather than requiring recipe
knowledge."
```

---

## Task 5: Fusion Cuisine — second Order and the name vote tally

Fusion is **standard mode plus two additions, not a replacement for it**: Signature nomination, The Crutch, the tier table, both penalties and Sous Chef Check all behave exactly as they do in standard play. Fusion adds only the second Order and the Name the Dish beat.

This task covers the *logic* — the two-Order draw and vote tallying. The prep-screen name field is Task 9; the vote screen is Task 11.

**Files:**
- Modify: `js/games/jec.js` — `jecStartRound` (two-Order draw), reroll listener, `jecCalcRoundScores`; add `jecTallyNameVotes`
- Test: `tools/verify-jec-loop.js` — append § 5

**Interfaces:**
- Consumes: `jecBonusValue`, `jecCalcRoundScores` from Task 2; `jecFusionCuisine` state.
- Produces:
  - `jecDrawOrders()` → sets `jecCurrentWord` and `jecCurrentWord2` (`''` when not Fusion); guarantees the two Orders differ
  - `jecTallyNameVotes()` → `{ votes: number[], winners: number[], bonus: number }` — `votes[p]` = tally received by Chef `p`; `winners` = every tied top-voted Chef index; `bonus` = `jecBonusValue()`. Also sets `jecNameWinners`.
  - `bonus[p].name` is now populated by `jecCalcRoundScores`

- [ ] **Step 1: Extend the bridge and write the failing assertions**

Add to the `BRIDGE` object:

```js
  get word()     { return jecCurrentWord; },
  get word2()    { return jecCurrentWord2; },
  get winners()  { return jecNameWinners; },
  setFusion(v)   { jecFusionCuisine = !!v; },
  drawOrders()   { jecDrawOrders(); return [jecCurrentWord, jecCurrentWord2]; },
  tallyNames()   { return jecTallyNameVotes(); },
```

Append § 5:

```js
// ── § 5 Fusion Cuisine ────────────────────────────────────────────────────────
// Two Orders drop together. "Pizza" has a guaranteed first instinct; "Sushi
// Pizza" does not - which is what makes the 2-match sweet spot reachable by
// thought rather than luck.
J.seat({ players: 4, golden: 30 });
J.setFusion(false);
J.resetPool();
check('standard draws one order', J.drawOrders()[1], '');

J.setFusion(true);
J.resetPool();
const pair = J.drawOrders();
check('fusion draws two orders',  pair[0] !== '' && pair[1] !== '', true);
check('fusion orders differ',     pair[0] !== pair[1], true);

// Fusion is standard mode PLUS two additions - the tier table is untouched.
check('fusion tier table unchanged', J.points(2, 4), 30);

// Name vote: most votes wins half a jackpot.
J.round({
  players: 4, golden: 30, fusion: true, word: 'sushi', word2: 'pizza',
  inputs: [['a0','a1','a2'], ['b0','b1','b2'], ['c0','c1','c2'], ['d0','d1','d2']],
  names: ['Sushizza', 'Pizushi', 'Rice Pie', 'Wet Bread'],
  votes: [1, 0, 0, 0],          // Chef 0 -> 1; Chefs 1,2,3 -> 0
});
let r = J.tallyNames();
check('vote tally',      r.votes,   [3, 1, 0, 0]);
check('single winner',   r.winners, [0]);
check('winner bonus',    r.bonus,   15);

// A Chef cannot vote for their own name. A self-vote is rejected outright rather
// than silently counted - the ballot renders it disabled, so a self-vote here
// only arrives from a malformed packet.
J.round({
  players: 3, golden: 30, fusion: true,
  inputs: [['a0','a1','a2'], ['b0','b1','b2'], ['c0','c1','c2']],
  names: ['Alpha', 'Bravo', 'Charlie'],
  votes: [0, 0, 1],             // Chef 0 votes for ITSELF - must not count
});
r = J.tallyNames();
check('self-vote rejected', r.votes, [1, 1, 0]);

// Ties: EVERY tied name takes the FULL bonus. No tie-break - a tie means two
// names were both funny, and a runoff costs another pass for no gain.
J.round({
  players: 4, golden: 20, fusion: true,
  inputs: [['a0','a1','a2'], ['b0','b1','b2'], ['c0','c1','c2'], ['d0','d1','d2']],
  names: ['Alpha', 'Bravo', 'Charlie', 'Delta'],
  votes: [1, 0, 0, 1],          // Chefs 0,3 -> 1 ; Chefs 1,2 -> 0
});
r = J.tallyNames();
check('tie tally',       r.votes,   [2, 2, 0, 0]);
check('both tied win',   r.winners, [0, 1]);
check('tied A paid',     J.last().bonus[0].name, 10);
check('tied B paid',     J.last().bonus[1].name, 10);
check('non-winner zero', J.last().bonus[2].name, 0);

// A Chef who submitted no name is simply not on the ballot. Validation should
// prevent this; the fallback exists for a dropped packet.
J.round({
  players: 3, golden: 30, fusion: true,
  inputs: [['a0','a1','a2'], ['b0','b1','b2'], ['c0','c1','c2']],
  names: ['Alpha', '', 'Charlie'],
  votes: [2, 2, 0],
});
r = J.tallyNames();
check('nameless chef cannot win', r.winners.includes(1), false);
check('nameless chef zero votes', r.votes[1], 0);

// Nobody voted at all (every device dropped) - no winner, no throw, no bonus.
J.round({
  players: 3, golden: 30, fusion: true,
  inputs: [['a0','a1','a2'], ['b0','b1','b2'], ['c0','c1','c2']],
  names: ['Alpha', 'Bravo', 'Charlie'],
  votes: [-1, -1, -1],
});
r = J.tallyNames();
check('no votes -> no winner', r.winners, []);
check('no votes -> no bonus',  J.last().bonus[0].name, 0);

// Standard mode never pays a name bonus even if names somehow survive in state.
J.round({
  players: 3, golden: 30, fusion: false,
  inputs: [['a0','a1','a2'], ['b0','b1','b2'], ['c0','c1','c2']],
  names: ['Alpha', 'Bravo', 'Charlie'],
  votes: [1, 0, 0],
});
check('standard mode pays no name bonus', J.last().bonus[0].name, 0);
```

Add one more bridge member used above:

```js
  resetPool() { jecWordPool = jecBuildFoodPool(allWords); },
```

- [ ] **Step 2: Run to verify it fails**

Run: `node tools/verify-jec-loop.js`
Expected: `ReferenceError: jecDrawOrders is not defined`.

- [ ] **Step 3: Add `jecDrawOrders`**

Insert into `js/games/jec.js` below `jecDrawInstruction`. It centralises the pool-refill logic currently duplicated between `jecStartRound` and the reroll listener:

```js
// Draws Today's Order — two of them in Fusion Cuisine. Refills the pool from the
// active source (Secret Mode expansion words, else the shared food category) when
// it runs dry. Centralised so jecStartRound and the Specials Board reroll cannot
// drift apart.
function jecRefillPool() {
  if (isSecretMode && secretWords && secretWords.length) {
    const foodWords = secretWords.filter(w => w.category === 'food').map(w => w.word);
    jecWordPool = shuffle(foodWords.length ? foodWords : secretWords.map(w => w.word));
  } else {
    jecWordPool = jecBuildFoodPool(allWords);
  }
}

function jecDrawOrders() {
  if (!jecWordPool.length) jecRefillPool();
  jecCurrentWord = jecWordPool.pop();
  if (!jecFusionCuisine) { jecCurrentWord2 = ''; return; }
  if (!jecWordPool.length) jecRefillPool();
  jecCurrentWord2 = jecWordPool.pop();
  // A pool of one would hand back the same word twice, and "Pizza + Pizza" is
  // not a fusion. Refill and take a different one.
  if (jecCurrentWord2 === jecCurrentWord) {
    jecRefillPool();
    jecCurrentWord2 = jecWordPool.filter(w => w !== jecCurrentWord).pop() || jecCurrentWord2;
  }
}
```

- [ ] **Step 4: Add `jecTallyNameVotes`**

Insert directly above `jecCalcRoundScores`:

```js
// Tallies the Name the Dish ballot. Ties are NOT broken — every tied name takes
// the full bonus, because a tie means two names were both funny and a runoff
// costs another pass for no gain.
function jecTallyNameVotes() {
  const votes = Array(jecPlayerCount).fill(0);
  if (!jecFusionCuisine) { jecNameWinners = []; return { votes, winners: [], bonus: jecBonusValue() }; }
  for (let p = 0; p < jecPlayerCount; p++) {
    const t = jecNameVotes[p];
    if (t === undefined || t === null || t < 0 || t >= jecPlayerCount) continue;
    if (t === p) continue;                                   // no self-votes
    if (!(jecFusionNames[t] || '').trim()) continue;          // not on the ballot
    votes[t]++;
  }
  const top = Math.max(0, ...votes);
  jecNameWinners = top > 0 ? votes.map((v, i) => (v === top ? i : -1)).filter(i => i >= 0) : [];
  return { votes, winners: [...jecNameWinners], bonus: jecBonusValue() };
}
```

- [ ] **Step 5: Pay the name bonus in `jecCalcRoundScores`**

The vote runs **after The Tasting and before The Tally** (spec § 3.3), so `jecNameWinners` is already populated by the time scoring runs. Add, immediately after the Crutch block inside the per-Chef loop:

```js
    if (jecFusionCuisine && jecNameWinners.includes(p)) {
      const b = jecBonusValue();
      roundScores[p] += b;
      bonus[p].name   = b;
    }
```

**And in the harness bridge's `round(o)`, call `jecTallyNameVotes()` before `jecCalcRoundScores()`** so the assertions above see the winners:

```js
    jecTallyNameVotes();
    globalThis.__jecLast = jecCalcRoundScores();
```

- [ ] **Step 6: Wire the two-Order draw into the round lifecycle**

- `jecStartRound` — replace the pool-refill block and `jecCurrentWord = jecWordPool.pop();` with a single `jecDrawOrders();`.
- The reroll listener (`btn-jec-reroll`, ~841) — replace its duplicated refill block with `jecDrawOrders(); jecDrawInstruction();` followed by the Task 8 repaint call. **A Fusion reroll redraws both Orders** (spec § 5, Specials Board note).

- [ ] **Step 7: Run to verify it passes**

Run: `node tools/verify-jec-loop.js`
Expected: `jec-loop: 82 passed, 0 failed`, exit 0.

- [ ] **Step 8: Commit**

```bash
git add tools/verify-jec-loop.js js/games/jec.js
git commit -m "feat(jec): add Fusion Cuisine's two-Order draw and name-vote tally

Fusion is standard mode plus two additions, not a replacement: Signature, The
Crutch, the tier table, both penalties and Sous Chef Check are untouched.

jecDrawOrders centralises pool refill so jecStartRound and the Specials Board
reroll cannot drift, and guarantees the two Orders differ - Pizza + Pizza is not
a fusion. jecTallyNameVotes rejects self-votes and off-ballot targets, and pays
every tied name the full bonus rather than running a tie-break pass."
```

---

## Task 6: `verify-jec-loopback.js` rig + the wire normalisers + core packet rewrite

Stands up the two-device harness **before** any further packet work, then rewrites `JEC_ORDER`, `JEC_PREP_SUBMIT` and `JEC_SIFTING` to carry the new fields through a Firebase-shaped wire.

**Why the wire and the DOM are non-negotiable.** Piping `mpSendEnvelope` straight into the handler passes live JS references, so every empty collection survives a trip Firebase would not have let it make — `jecCrutches` as all-`''` is exactly the shape that vanishes. And `getElementById: () => null` short-circuits every `if (!el) return` guard, so **no render code executes at all**; a render throw inside a SYNC applier escapes through `mpHandleEnvelope` and strands the device, invisibly to every single-mode harness. CJAR's BUG-06 survived 222 green single-mode checks in exactly this gap.

**Files:**
- Create: `tools/verify-jec-loopback.js`
- Modify: `js/games/jec.js` — add `jecWireArr`/`jecWireList`/`jecWireObj`; `jecStartRound`'s `JEC_ORDER` broadcast; `jecSubmitIngredients`'s host path
- Modify: `js/engine-multiplayer.js` — the `JEC_ORDER`, `JEC_PREP_SUBMIT`, `JEC_SIFTING`, `JEC_MERGE` handlers (~1176–1245)

**Interfaces:**
- Consumes: everything from Tasks 2–5.
- Produces:
  - `jecWireArr(v, n, fill)` → `any[]` of length exactly `n`, `undefined`/`null` slots replaced by `fill`
  - `jecWireList(v)` → `any[]` — length-unknown lists; accepts an index-keyed object
  - `jecWireObj(v)` → `object` — `{}` when erased
  - Packet shapes for `JEC_ORDER` / `JEC_PREP_SUBMIT` / `JEC_SIFTING` per spec § 7.1
  - The loopback harness's `makeDevice(name, mode, myIdx, slots)` and `wire(env)` — Tasks 10–12 add scenarios to this file

- [ ] **Step 1: Add the wire normalisers to `js/games/jec.js`**

Insert directly below the state block, above `JEC_INSTRUCTIONS`. This is `cjarWireArr`'s shape (`js/games/cjar.js:178`), which is the suite reference:

```js
// ── Firebase wire normalisers ────────────────────────────────────────────────
// Firebase RTDB stores no null, no {} and no []: a key holding any of them is
// DELETED, and the reader gets undefined. An array whose entries are all null
// vanishes whole; a half-dense one comes back as an OBJECT keyed by index, not
// an array. false, 0 and '' are legitimate stored values and are never at risk —
// only emptiness is erased.
//
// That collides head-on with the accumulator rule: doing that rule correctly
// means broadcasting jecCrutches as all-'', jecSignatures as all-−1 and
// jecNameVotes as all-−1, and each of those is at risk in flight. Both halves
// are needed — send the reset value explicitly AND rebuild it on receipt. Never
// assign a raw p.x collection field.
function jecWireArr(v, n, fill) {
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const x = v ? v[i] : undefined;
    out[i] = (x === undefined || x === null) ? fill : x;
  }
  return out;
}
function jecWireList(v) {
  if (Array.isArray(v)) return v.filter(x => x !== undefined && x !== null);
  if (v && typeof v === 'object') return Object.keys(v).sort((a, b) => a - b).map(k => v[k]);
  return [];
}
function jecWireObj(v) { return (v && typeof v === 'object') ? v : {}; }
```

- [ ] **Step 2: Write the loopback harness**

Create `tools/verify-jec-loopback.js`. The wire (`fbWrite`/`fbRead`) and `makeDocument` are lifted verbatim from `tools/verify-cjar-loopback.js:44-110` — copy them rather than re-deriving, and read that file's header comment first.

```js
// ═══════════════════════════════════════════════════════════════════════════
// verify-jec-loopback.js — drives Just Enough Cooks host↔client over a
// Firebase-shaped WIRE with a REAL mock DOM.
//
//   node tools/verify-jec-loopback.js
//   JEC_SRC=/path/to/broken.js node tools/verify-jec-loopback.js
//
// verify-jec-loop.js runs in 'single' mode with one process driving all N seats,
// which is what lets it assert rules — and exactly what blinds it to the packet
// layer and to every line of render code. This file closes both gaps:
//
//   • THE WIRE. fbWrite/fbRead reproduce what Firebase actually persists and
//     hands back. null, {} and [] are DELETED in flight; '' , 0 and false
//     survive. Piping mpSendEnvelope straight into the handler would pass live
//     JS references and let every empty collection make a trip Firebase would
//     not have allowed.
//   • A REAL DOM. getElementById: () => null short-circuits every `if (!el)
//     return` guard, so no render code executes at all and a render throw inside
//     a SYNC applier is invisible. These elements are real objects.
//
// Still NOT a substitute for a three-device session: no clock skew, no Firebase
// ordering, no dropped packets, nothing visual.
// ═══════════════════════════════════════════════════════════════════════════
```

Then, in order:

1. **The wire** — copy `fbWrite`, `fbRead` and `const wire = env => {…}` verbatim from `tools/verify-cjar-loopback.js:44-79`.
2. **Assert the wire itself first**, before any game code runs. A harness whose wire is wrong passes while the game is broken:
   ```js
   check('wire: empty array is erased',   wire({ a: [] }),               undefined);
   check('wire: empty object is erased',  wire({ a: {} }),               undefined);
   check('wire: all-null array vanishes', wire({ a: [null, null] }),     undefined);
   check("wire: '' survives",             wire({ a: '' }).a,             '');
   check('wire: 0 survives',              wire({ a: 0 }).a,              0);
   check('wire: false survives',          wire({ a: false }).a,          false);
   check('wire: -1 survives',             wire({ a: -1 }).a,             -1);
   check("wire: all-'' array survives",   wire({ a: ['', ''] }).a,       ['', '']);
   check('wire: sparse array -> nulls',   wire({ a: ['x', null, 'y'] }).a, ['x', null, 'y']);
   ```
3. **`makeDocument()`** — copy from `verify-cjar-loopback.js:83-111`, and add `value: ''` and `placeholder: ''` to the element factory (JEC's prep screen reads `.value` from four inputs; CJAR has none).
4. **`makeDevice(name, mode, myIdx, slots)`** — same shape as CJAR's, with JEC's sandbox globals: `allWords`, `loadWords`, `normaliseWord`, `shuffle` (**the real Fisher–Yates from `engine.js:560`, not the identity** — a Fusion draw needs two distinct words), `isSecretMode: false`, `secretWords: []`. `mpSendEnvelope` **captures** into `device.__sent` rather than throwing (this is lobby mode). `mpMyPlayerIdx` and `mpPlayerSlots` come from the arguments.
5. **`deliver(from, to, env)`** — the routing helper. Every assertion goes through it:
   ```js
   // Route one envelope from one device to another THROUGH the wire, exactly as
   // mpHandleEnvelope would. A throw inside an applier is captured, not swallowed:
   // in the real app it escapes through mpHandleEnvelope and strands the device.
   function deliver(from, to, env) {
     const onWire = wire(env);
     if (onWire === undefined) { to.__errors.push('envelope erased whole: ' + env.payload.action); return; }
     try { to.__handle(onWire); }
     catch (e) { to.__errors.push(env.payload.action + ': ' + e.message); }
   }
   ```
   `to.__handle` is a bridge function that runs the **same** `if (mpActiveGame === 'jec') { … }` handler body. Because those handlers live inline in `js/engine-multiplayer.js` rather than in the plugin, extract the JEC block into a named function first — see Step 3.

- [ ] **Step 3: Extract the inline JEC handler block into a named function**

The spec is explicit that JEC's handlers live inline in `js/engine-multiplayer.js` (~1176–1270). Leaving them inline makes them unreachable from a harness. Extract the block into `jecHandleEnvelope(env)` **in `js/engine-multiplayer.js`** (not the plugin — keeping it in the engine file preserves the Phase-22 layout and avoids a load-order question), and replace the inline block with a call:

```js
  // ── Just Enough Cooks ACTION/SYNC ─────────────────────────────────────────
  // Extracted from an inline block so tools/verify-jec-loopback.js can drive the
  // real handlers. Behaviour is unchanged; only the call boundary is new.
  if (mpActiveGame === 'jec') jecHandleEnvelope(env);
```

Define `jecHandleEnvelope(env)` at the end of `js/engine-multiplayer.js`, containing the same body verbatim. The harness's `__handle` bridge then calls it directly.

- [ ] **Step 4: Write the failing packet assertions**

```js
// ── § 1 JEC_ORDER carries the instruction and the second Order ────────────────
const slots = [{ uid: 'u0', nickname: 'Sam' }, { uid: 'u1', nickname: 'Ali' },
               { uid: 'u2', nickname: 'Bo' }];
const host   = makeDevice('host',   'host',   0, slots);
const client = makeDevice('client', 'client', 1, slots);

host.__seat({ players: 3, golden: 30, instructions: true, fusion: true });
client.__seat({ players: 3, golden: 30, instructions: true, fusion: true });
host.__startRound();
let env = host.__lastSent('JEC_ORDER');
check('JEC_ORDER has word',        typeof env.payload.word, 'string');
check('JEC_ORDER has word2',       env.payload.word2 !== undefined, true);
check('JEC_ORDER word2 non-empty', env.payload.word2 !== '', true);
check('JEC_ORDER has instruction', env.payload.instruction !== undefined, true);
deliver(host, client, env);
check('client took order',   client.__state().word,  env.payload.word);
check('client took order2',  client.__state().word2, env.payload.word2);
check('client took instr',   client.__state().instruction, env.payload.instruction);
check('no throw on JEC_ORDER', client.__errors, []);

// Standard mode: word2 and instruction are '' — the two values Firebase is most
// likely to erase. They must arrive as '' on the client, never undefined.
host.__seat({ players: 3, golden: 30, instructions: false, fusion: false });
client.__seat({ players: 3, golden: 30, instructions: false, fusion: false });
host.__startRound();
env = host.__lastSent('JEC_ORDER');
check('standard word2 is empty string',  env.payload.word2, '');
check('standard instr is empty string',  env.payload.instruction, '');
deliver(host, client, env);
check('client word2 rebuilt to empty',   client.__state().word2, '');
check('client instr rebuilt to empty',   client.__state().instruction, '');

// ── § 2 JEC_PREP_SUBMIT ───────────────────────────────────────────────────────
// Fields per spec § 7.1: -poison, +crutch, +signatureIdx, +fusionName.
const sub = client.__submitPrep({ ingredients: ['cheese','ham','basil'],
                                  crutch: 'cheese', signatureIdx: 1, fusionName: '' });
check('ACTION not SYNC',      sub.type, 'ACTION');
check('no poison field',      'poison' in sub.payload, false);
check('has crutch',           sub.payload.crutch, 'cheese');
check('has signatureIdx',     sub.payload.signatureIdx, 1);
check('fusionName is empty string, not null', sub.payload.fusionName, '');
check('signatureIdx 0 survives the wire', wire(sub).payload.signatureIdx, undefined);
```

**Note on that last check:** `signatureIdx: 0` is a legitimate stored value and survives — but if the whole payload object were `{ signatureIdx: 0 }` alone it would still survive, since `0` is not empty. The check above is written against a full payload and must read `0`; correct it to `check('signatureIdx 0 survives', wire({ payload: { signatureIdx: 0, x: 1 } }).payload.signatureIdx, 0);` when writing the file. Verify by running, not by reasoning.

```js
// ── § 3 JEC_SIFTING rebuilds every collection ─────────────────────────────────
// Three Chefs submit; the host resolves and broadcasts. jecCrutches all-'' and
// jecSignatures all--1 are the two arrays Firebase is most likely to mangle.
host.__seat({ players: 3, golden: 30 });
client.__seat({ players: 3, golden: 30 });
host.__startRound();
deliver(host, client, host.__lastSent('JEC_ORDER'));
// Host processes its OWN submission directly — never via mpSendEnvelope. The
// dedup guard drops originId === syllyDeviceUid, which is bug J1.
host.__hostSubmitOwn({ ingredients: ['cheese','a1','a2'], crutch: '', signatureIdx: 0 });
check('no self-sent ACTION from host',
  host.__sent.filter(e => e.type === 'ACTION' && e.payload.playerIdx === 0).length, 0);
deliver(client, host, client.__submitPrep({ ingredients: ['cheese','b1','b2'], crutch: '', signatureIdx: 0, fusionName: '' }));
deliver(client, host, host.__fakeSubmit(2, { ingredients: ['c0','c1','c2'], crutch: '', signatureIdx: 0, fusionName: '' }));

env = host.__lastSent('JEC_SIFTING');
check('sifting broadcast exists', !!env, true);
check("all-'' crutches sent explicitly", env.payload.jecCrutches, ['', '', '']);
deliver(host, client, env);
check("client rebuilt all-'' crutches", client.__state().crutches, ['', '', '']);
check('client crutches length is N',    client.__state().crutches.length, 3);
check('client signatures rebuilt',      client.__state().signatures, [0, 0, 0]);
check('client freq matches host',       client.__state().freq, host.__state().freq);
check('no throw on JEC_SIFTING',        client.__errors, []);

// An all--1 signature array (nobody nominated — every prep packet dropped) is the
// erasure worst case: the array vanishes whole and must be rebuilt to length N.
host.__forceSignatures([-1, -1, -1]);
env = host.__rebroadcastSifting();
deliver(host, client, env);
check('all--1 signatures rebuilt to length N', client.__state().signatures, [-1, -1, -1]);

// ── § 4 A render throw inside a SYNC applier is caught, not silent ─────────────
// This is the check getElementById: () => null cannot make. If a JEC_SIFTING
// applier throws while rendering, mpHandleEnvelope propagates it and the device
// is stranded on the previous screen with no error anywhere.
check('client reached the sifting screen',
  client.__screens[client.__screens.length - 1], 'screen-jec-sifting');
```

- [ ] **Step 5: Run to verify it fails**

Run: `node tools/verify-jec-loopback.js`
Expected: failures on `JEC_ORDER has word2` / `has instruction` / the crutch rebuild — the packets do not carry those fields yet.

- [ ] **Step 6: Rewrite `JEC_ORDER`**

In `js/games/jec.js`, `jecStartRound`'s host broadcast becomes:

```js
  if (window.syllyMultiplayerMode === 'host') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'JEC_ORDER',
      word: jecCurrentWord,
      word2: jecCurrentWord2 || '',        // '' not null — null is erased in flight
      instruction: jecInstruction || '',   // same
      round: jecRound, rounds: jecRounds,
    }});
  }
```

In `js/engine-multiplayer.js`'s `jecHandleEnvelope`:

```js
    if (env.type === 'SYNC' && env.payload.action === 'JEC_ORDER') {
      const p = env.payload;
      jecCurrentWord  = p.word;
      jecCurrentWord2 = p.word2 || '';
      jecInstruction  = p.instruction || '';
      jecRound        = p.round;
      jecRounds       = p.rounds;
      jecInputs       = Array.from({ length: jecPlayerCount }, () => ['', '', '']);
      jecSignatures   = Array(jecPlayerCount).fill(-1);
      jecCrutches     = Array(jecPlayerCount).fill('');
      jecFusionNames  = Array(jecPlayerCount).fill('');
      jecNameVotes    = Array(jecPlayerCount).fill(-1);
      jecNameWinners  = [];
      jecMpReadyCheck = Array(jecPlayerCount).fill(false);
      jecMpVoteCheck  = Array(jecPlayerCount).fill(false);
      jecShowOrderScreen();
    }
```

- [ ] **Step 7: Rewrite `JEC_PREP_SUBMIT` and `JEC_SIFTING`**

`JEC_PREP_SUBMIT` handler:

```js
    if (env.type === 'ACTION' && env.payload.action === 'JEC_PREP_SUBMIT' &&
        window.syllyMultiplayerMode === 'host') {
      const p = env.payload;
      jecInputs[p.playerIdx]      = jecWireArr(p.ingredients, 3, '');
      jecCrutches[p.playerIdx]    = p.crutch || '';
      jecSignatures[p.playerIdx]  = (p.signatureIdx === undefined || p.signatureIdx === null) ? -1 : p.signatureIdx;
      jecFusionNames[p.playerIdx] = p.fusionName || '';
      jecMpReadyCheck[p.playerIdx] = true;
      if (jecMpReadyCheck.every(Boolean)) jecHostResolveSifting();
    }
```

Add `jecHostResolveSifting()` to `js/games/jec.js` so the host's own submit path and this handler cannot drift — the shape that produced bug J1:

```js
// Called once every Chef has submitted, from BOTH the host's own submit path and
// the JEC_PREP_SUBMIT handler. One function, so the two cannot drift.
function jecHostResolveSifting() {
  jecBuildFrequency();
  mpSendEnvelope({ type: 'SYNC', payload: {
    action:           'JEC_SIFTING',
    jecInputs:        jecInputs.map(a => [...a]),
    jecWordFrequency: { ...jecWordFrequency },
    jecDisplayWords:  { ...jecDisplayWords },
    jecMergeMap:      { ...jecMergeMap },
    // Every accumulator at its reset value, explicitly. All-'' and all--1 are the
    // exact shapes Firebase erases; sending them is half the fix, rebuilding them
    // on receipt is the other half.
    jecCrutches:      [...jecCrutches],
    jecSignatures:    [...jecSignatures],
    jecFusionNames:   [...jecFusionNames],
  }});
  mpUnlockSync();
  jecStartSifting();
}
```

`JEC_SIFTING` handler — **every collection through a normaliser**:

```js
    if (env.type === 'SYNC' && env.payload.action === 'JEC_SIFTING') {
      const p = env.payload;
      jecInputs        = jecWireArr(p.jecInputs, jecPlayerCount, null)
                           .map(a => jecWireArr(a, 3, ''));
      jecWordFrequency = jecWireObj(p.jecWordFrequency);
      jecDisplayWords  = jecWireObj(p.jecDisplayWords);
      jecMergeMap      = jecWireObj(p.jecMergeMap);
      jecCrutches      = jecWireArr(p.jecCrutches,    jecPlayerCount, '');
      jecSignatures    = jecWireArr(p.jecSignatures,  jecPlayerCount, -1);
      jecFusionNames   = jecWireArr(p.jecFusionNames, jecPlayerCount, '');
      mpUnlockSync();
      jecStartSifting();
    }
```

`JEC_MERGE` handler — drop `jecPoisonedNorms`, normalise the three objects:

```js
    if (env.type === 'SYNC' && env.payload.action === 'JEC_MERGE') {
      const p = env.payload;
      jecWordFrequency = jecWireObj(p.jecWordFrequency);
      jecDisplayWords  = jecWireObj(p.jecDisplayWords);
      jecMergeMap      = jecWireObj(p.jecMergeMap);
      jecRenderSifting();
    }
```

- [ ] **Step 8: Run both harnesses**

Run: `node tools/verify-jec-loop.js && node tools/verify-jec-loopback.js`
Expected: both exit 0. The loopback should report roughly 30 passed.

Then prove the loopback can fail, the way CJAR's `CJAR_SRC=` proved BUG-06:

```bash
cp js/games/jec.js /tmp/jec-broken.js
# revert one wire rebuild to a raw assignment
sed -i "s/jecCrutches      = jecWireArr(p.jecCrutches,    jecPlayerCount, '');/jecCrutches = p.jecCrutches;/" /tmp/jec-broken.js
```
Since that line lives in `js/engine-multiplayer.js`, not the plugin, add an `MP_SRC=`-style override to the harness (`process.env.JEC_MP_SRC`) or perform the same experiment on the plugin-side `jecWireArr` definition. **Confirm the harness goes red before trusting that it is green.**

- [ ] **Step 9: Commit**

```bash
git add tools/verify-jec-loopback.js js/games/jec.js js/engine-multiplayer.js
git commit -m "test(jec): add two-device loopback; rewrite the core three packets

JEC_ORDER now carries word2 and instruction; JEC_PREP_SUBMIT drops poison and
carries crutch, signatureIdx and fusionName; JEC_SIFTING sends every accumulator
at its reset value and the client rebuilds each through jecWireArr/Obj.

All-'' and all--1 arrays are exactly what Firebase deletes in flight, so both
halves are needed. The harness asserts the wire's own behaviour first, then the
packets, through real mock elements - a render throw inside a SYNC applier is
invisible to a getElementById: () => null harness.

The inline JEC handler block is extracted to jecHandleEnvelope so the harness can
drive the real code, and jecHostResolveSifting is shared by the host's own submit
path and the ACTION handler so the two cannot drift (the shape of bug J1)."
```

---

## Task 7: Settings overlay — nine settings, renamed and rewired

**Files:**
- Modify: `index.html` ~2460–2568 (`jec-settings-overlay`) — **Node script**
- Modify: `js/games/jec.js` — the settings listeners (~87–180)
- Modify: `js/engine-multiplayer.js` ~840–842 and ~987–995 — settings sync

**Interfaces:**
- Consumes: the renamed settings variables from Task 2, `jecSpecialInstructions` from Task 4.
- Produces: `jecSyncSettingsUI()` — repaints every pill, toggle and value line from current state; called on overlay open and by every handler. Task 13 reuses it.

**Settings table (spec § 5) — nine cards, in this order:**

| # | Card | Options | Default | `data-` attribute |
|---|---|---|---|---|
| 1 | Courses | 3 · 5 · 10 | 3 | `data-jec-rounds` |
| 2 | The Menu | Everyday · Restaurant · Fine Dining | Restaurant (`mixed`) | `data-jec-food-difficulty` |
| 3 | The Sweet Spot | 10 · 20 · 30 pts | 30 | `data-jec-golden` |
| 4 | Table for One Penalty | Off · On | Off | `data-jec-tablefor1` |
| 5 | Crowded Kitchen Tax | Off · On | Off | `data-jec-tax` |
| 6 | Sous Chef Check | toggle | ON | `btn-jec-souschef-toggle` |
| 7 | Specials Board | toggle | OFF | `btn-jec-specials-toggle` |
| 8 | Special Instructions | toggle | OFF | `btn-jec-instructions-toggle` |
| 9 | ✨ Sylly Mode — Fusion Cuisine | toggle | OFF | `btn-jec-sylly-toggle` |

Special Instructions sits directly above Sylly Mode as an **ordinary card** — *not* the sanctioned exclusivity-partner slot. The two settings **stack** deliberately (spec § 3.4); do not add `opacity-50 pointer-events-none` or an amber reason line between them.

- [ ] **Step 1: Write the Node rewrite script**

Write to the scratchpad, not the repo. Read `index.html` as utf8, replace the settings-overlay block between the `<!-- JEC Pantry Cabinet — settings overlay (Pattern 1) -->` comment and the `<!-- JEC How to Play overlay (Pattern 1) -->` comment, and write back as utf8:

```js
const fs = require('fs');
const P  = 'index.html';
let s = fs.readFileSync(P, 'utf8');
const START = '  <!-- JEC Pantry Cabinet — settings overlay (Pattern 1) -->';
const END   = '  <!-- JEC How to Play overlay (Pattern 1) -->';
const i = s.indexOf(START), j = s.indexOf(END);
if (i < 0 || j < 0 || j < i) throw new Error('anchors not found — do not proceed');
const block = `<REPLACEMENT>`;
s = s.slice(0, i) + block + s.slice(j);
fs.writeFileSync(P, s, 'utf8');
console.log('settings overlay replaced,', block.length, 'chars');
```

The replacement block: keep the outer `<div id="jec-settings-overlay" …>` / `overlay-data-inner settings-slide-up` wrapper and the `btn-jec-settings-done` button verbatim from the current markup; change only the title block and the nine cards.

Title block:
```html
      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">The Pantry 🍳</h2>
        <p class="text-stone-400 text-xs mt-1">Prep before you cook.</p>
      </div>
```

Cards 1–3 are pill groups; keep the existing card shape and swap the labels:

```html
      <!-- 1. Courses -->
      <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
        <div>
          <p class="text-stone-800 font-semibold">Courses</p>
          <p class="text-stone-400 text-sm mt-0.5">How many Orders in one meal.</p>
        </div>
        <div class="flex gap-2">
          <button class="pill pill-active-amber" data-jec-rounds="3">3</button>
          <button class="pill" data-jec-rounds="5">5</button>
          <button class="pill" data-jec-rounds="10">10</button>
        </div>
      </div>

      <!-- 2. The Menu -->
      <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
        <div>
          <p class="text-stone-800 font-semibold">The Menu</p>
          <p class="text-stone-400 text-sm mt-0.5">How advanced the food on the Order can get.</p>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex gap-2 flex-wrap">
            <button class="pill" data-jec-food-difficulty="easy">Everyday</button>
            <button class="pill pill-active-amber" data-jec-food-difficulty="mixed">Restaurant</button>
            <button class="pill" data-jec-food-difficulty="hard">Fine Dining</button>
          </div>
          <p id="jec-val-difficulty" class="text-stone-400 text-xs"></p>
        </div>
      </div>
```

Card 3 (The Sweet Spot) keeps its pills; update its description to mention the bonuses it now also sets:
```html
          <p class="text-stone-400 text-sm mt-0.5">Points for a 2-Chef match — the jackpot. Also sets every bonus at half that.</p>
```

Cards 4 and 5 keep the pill-group shape with renamed labels and `data-` attributes:
```html
      <!-- 4. Table for One Penalty -->
      <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
        <div>
          <p class="text-stone-800 font-semibold">Table for One Penalty</p>
          <p class="text-stone-400 text-sm mt-0.5">Nobody joined you on that ingredient.</p>
        </div>
        <div class="flex gap-2">
          <button class="pill pill-active-amber" data-jec-tablefor1="off">Off</button>
          <button class="pill" data-jec-tablefor1="on">On</button>
        </div>
        <p id="jec-tablefor1-desc" class="text-stone-400 text-xs" style="visibility:hidden">Table for One costs −5 pts.</p>
      </div>

      <!-- 5. Crowded Kitchen Tax -->
      <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
        <div>
          <p class="text-stone-800 font-semibold">Crowded Kitchen Tax</p>
          <p class="text-stone-400 text-sm mt-0.5">Too many cooks spoil the broth.</p>
        </div>
        <div class="flex gap-2">
          <button class="pill pill-active-amber" data-jec-tax="off">Off</button>
          <button class="pill" data-jec-tax="on">On</button>
        </div>
        <p id="jec-tax-desc" class="text-stone-400 text-xs" style="visibility:hidden">−2 pts per Chef who picked it, including you.</p>
      </div>
```

**That last line closes the second half of bug J2** — the old copy said "−2 per *extra* Chef" when it is −2 per Chef **including you**.

Cards 6–8 are toggle cards (§ Settings Card Standard shape):
```html
      <!-- 6. Sous Chef Check -->
      <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <p class="text-stone-800 font-semibold">Sous Chef Check</p>
          <button id="btn-jec-souschef-toggle" class="game-toggle-on-amber shrink-0">ON</button>
        </div>
        <p class="text-stone-400 text-sm">Before anything is scored, merge ingredients that are the same word spelt differently.</p>
      </div>

      <!-- 7. Specials Board -->
      <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <p class="text-stone-800 font-semibold">Specials Board</p>
          <button id="btn-jec-specials-toggle" class="game-toggle-off shrink-0">OFF</button>
        </div>
        <p class="text-stone-400 text-sm">Let the table reroll the Order before prepping starts. Unlimited rerolls — use fair play.</p>
      </div>

      <!-- 8. Special Instructions -->
      <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <p class="text-stone-800 font-semibold">Special Instructions</p>
          <button id="btn-jec-instructions-toggle" class="game-toggle-off shrink-0">OFF</button>
        </div>
        <p class="text-stone-400 text-sm">Every Order comes with a twist — a budget, an occasion, a bit of chaos.</p>
      </div>
```

Card 9 (Sylly Mode) — **Fusion Cuisine**:
```html
      <!-- ✨ Sylly Mode (always last) -->
      <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <p class="text-stone-800 font-semibold">✨ Sylly Mode</p>
          <button id="btn-jec-sylly-toggle" class="game-toggle-off shrink-0">OFF</button>
        </div>
        <p class="text-stone-600 text-sm font-semibold">Fusion Cuisine</p>
        <p class="text-stone-400 text-sm">Two Orders drop at once. Prep three ingredients for the imagined mash-up, name the thing, then vote on the best name.</p>
      </div>
```

**Note:** the old markup used the deprecated `sylly-toggle-off` alias on three toggles. Use `game-toggle-off` (canonical) throughout the new block.

- [ ] **Step 2: Run the script and verify the file is not corrupted**

```bash
node scratchpad/rewrite-jec-settings.js
git diff --stat index.html
node -e "const s=require('fs').readFileSync('index.html','utf8'); const bad=s.match(/â€|Ã©|ï¿½/g); console.log('mojibake hits:', bad ? bad.length : 0);"
```
Expected: the diff touches only the settings block; **mojibake hits: 0**. If it is non-zero, `git checkout index.html` and fix the script's encoding before retrying.

- [ ] **Step 3: Rewrite the settings listeners in `js/games/jec.js`**

Replace the whole `// ── JEC Settings` listener block (~87–180) with a `jecSyncSettingsUI()` + handlers pattern. Every pill group follows the § Pill toggle rule — `.pill` base class always stays:

```js
// ── JEC Settings (The Pantry) ────────────────────────────────────────────────
// Repaints every control from current state. Called on overlay open AND from
// every handler, so a Terminal override or a lobby SETTINGS_SYNC can never leave
// a stale pill lit.
function jecSyncSettingsUI() {
  const pills = (attr, val) => document.querySelectorAll(`[${attr}]`).forEach(b => {
    b.className = `pill${b.getAttribute(attr) === String(val) ? ' pill-active-amber' : ''}`;
  });
  pills('data-jec-rounds',          jecRounds);
  pills('data-jec-golden',          jecGoldenScore);
  pills('data-jec-food-difficulty', jecFoodDifficulty);
  pills('data-jec-tablefor1',       jecTableForOnePenalty ? 'on' : 'off');
  pills('data-jec-tax',             jecCrowdedKitchenTax  ? 'on' : 'off');

  const toggle = (id, on) => {
    const b = document.getElementById(id);
    if (!b) return;
    b.textContent = on ? 'ON' : 'OFF';
    b.className   = on ? 'game-toggle-on-amber shrink-0' : 'game-toggle-off shrink-0';
  };
  toggle('btn-jec-souschef-toggle',     jecSousChefCheck);
  toggle('btn-jec-specials-toggle',     jecSpecialsBoard);
  toggle('btn-jec-instructions-toggle', jecSpecialInstructions);
  toggle('btn-jec-sylly-toggle',        jecFusionCuisine);

  const d1 = document.getElementById('jec-tablefor1-desc');
  if (d1) d1.style.visibility = jecTableForOnePenalty ? 'visible' : 'hidden';
  const d2 = document.getElementById('jec-tax-desc');
  if (d2) d2.style.visibility = jecCrowdedKitchenTax ? 'visible' : 'hidden';
  jecUpdateMenuVal();
}

// Dynamic value line (ui-style.md § Settings Card Standard, DD-13) — the pill
// carries the thematic name only; this says what it means for the word pool.
function jecUpdateMenuVal() {
  const el = document.getElementById('jec-val-difficulty');
  if (!el) return;
  el.textContent = { easy:  'Everyday uses only the easiest food words.',
                     mixed: 'Restaurant mixes easy and medium food words.',
                     hard:  'Fine Dining uses only the hardest food words.' }[jecFoodDifficulty] || '';
}

document.querySelectorAll('[data-jec-rounds]').forEach(btn => btn.addEventListener('click', () => {
  playPillClick(); jecRounds = parseInt(btn.dataset.jecRounds); jecSyncSettingsUI();
}));
document.querySelectorAll('[data-jec-golden]').forEach(btn => btn.addEventListener('click', () => {
  playPillClick(); jecGoldenScore = parseInt(btn.dataset.jecGolden); jecSyncSettingsUI();
}));
document.querySelectorAll('[data-jec-food-difficulty]').forEach(btn => btn.addEventListener('click', () => {
  playPillClick(); jecFoodDifficulty = btn.dataset.jecFoodDifficulty; jecSyncSettingsUI();
}));
document.querySelectorAll('[data-jec-tablefor1]').forEach(btn => btn.addEventListener('click', () => {
  playPillClick(); jecTableForOnePenalty = btn.dataset.jecTablefor1 === 'on'; jecSyncSettingsUI();
}));
document.querySelectorAll('[data-jec-tax]').forEach(btn => btn.addEventListener('click', () => {
  playPillClick(); jecCrowdedKitchenTax = btn.dataset.jecTax === 'on'; jecSyncSettingsUI();
}));
document.getElementById('btn-jec-souschef-toggle').addEventListener('click', () => {
  playPillClick(); jecSousChefCheck = !jecSousChefCheck; jecSyncSettingsUI();
});
document.getElementById('btn-jec-specials-toggle').addEventListener('click', () => {
  playPillClick(); jecSpecialsBoard = !jecSpecialsBoard; jecSyncSettingsUI();
});
document.getElementById('btn-jec-instructions-toggle').addEventListener('click', () => {
  playPillClick(); jecSpecialInstructions = !jecSpecialInstructions; jecSyncSettingsUI();
});
document.getElementById('btn-jec-sylly-toggle').addEventListener('click', () => {
  jecFusionCuisine = !jecFusionCuisine;
  jecFusionCuisine ? playSyllyOn() : playSyllyOff();
  jecSyncSettingsUI();
});
document.getElementById('btn-jec-settings-done').addEventListener('click', () => {
  playDone();
  document.getElementById('jec-settings-overlay').style.display = 'none';
});
```

Call `jecSyncSettingsUI()` in the settings-open handler (`btn-jec-menu-settings`, ~68) after the scroll reset, and once at file load in place of the old bare `jecUpdateFoodDifficultyVal()` call.

- [ ] **Step 4: Update the lobby settings sync**

`js/engine-multiplayer.js` ~840–842:
```js
    case 'jec': return {
      jecRounds, jecGoldenScore, jecTableForOnePenalty, jecCrowdedKitchenTax,
      jecSousChefCheck, jecFusionCuisine, jecFoodDifficulty, jecSpecialsBoard,
      jecSpecialInstructions,
    };
```

~987–995, the applier — add `jecSpecialInstructions` and repaint the UI so a client's Pantry reflects the host's choices:
```js
        case 'jec':
          if (s.jecRounds              !== undefined) jecRounds              = s.jecRounds;
          if (s.jecGoldenScore         !== undefined) jecGoldenScore         = s.jecGoldenScore;
          if (s.jecTableForOnePenalty  !== undefined) jecTableForOnePenalty  = s.jecTableForOnePenalty;
          if (s.jecCrowdedKitchenTax   !== undefined) jecCrowdedKitchenTax   = s.jecCrowdedKitchenTax;
          if (s.jecSousChefCheck       !== undefined) jecSousChefCheck       = s.jecSousChefCheck;
          if (s.jecFusionCuisine       !== undefined) jecFusionCuisine       = s.jecFusionCuisine;
          if (s.jecFoodDifficulty      !== undefined) jecFoodDifficulty      = s.jecFoodDifficulty;
          if (s.jecSpecialsBoard       !== undefined) jecSpecialsBoard       = s.jecSpecialsBoard;
          if (s.jecSpecialInstructions !== undefined) jecSpecialInstructions = s.jecSpecialInstructions;
          jecSyncSettingsUI();
          break;
```

**Every one of these is a boolean or a number** — `false` and `0` are safe over the wire; none of them is at erasure risk.

- [ ] **Step 5: Verify**

```bash
node tools/verify-jec-loop.js && node tools/verify-jec-loopback.js && node tools/verify-mp-configs.js
```
Expected: all three exit 0.

Then invoke the **`visual-check`** skill on `screen-jec-menu` with the settings overlay open, at 3 and 6 players. Confirm: nine cards in the documented order, Sylly Mode last, Special Instructions directly above it as an ordinary card (no dimming, no amber reason line), pill rows not wrapping unevenly, and the value line under The Menu reading its stone-400 text.

- [ ] **Step 6: Commit**

```bash
git add index.html js/games/jec.js js/engine-multiplayer.js
git commit -m "feat(jec): rebuild The Pantry - nine settings, renamed and rewired

Dishes -> Courses. Menu Complexity -> The Menu (Everyday/Restaurant/Fine Dining;
the pills named the cook, but the setting is about the food, and 'Sous Chef'
collided with Sous Chef Check on the same screen). Rotten -> Table for One
Penalty and Spoilt -> Crowded Kitchen Tax, so both penalties now name the badge
they punish. Sous Chef Oversight -> Sous Chef Check. The Pantry Cabinet -> The
Pantry, because a pantry is a cabinet.

Adds Special Instructions (default OFF) as an ordinary card directly above Sylly
Mode - the two stack deliberately, so this is not the exclusivity-partner slot.
Sylly Mode is now Fusion Cuisine.

Closes the second half of bug J2: the Crowded Kitchen Tax line now reads -2 per
Chef INCLUDING you, which is what the code has always done.

Settings are repainted through one jecSyncSettingsUI() so a Terminal override or
a lobby SETTINGS_SYNC can no longer leave a stale pill lit."
```

---

## Task 8: The Order screen — the Special Instruction and the Fusion pairing

**Files:**
- Modify: `index.html` ~2311–2327 (`screen-jec-order`) — **Node script**
- Modify: `js/games/jec.js` — `jecShowOrderScreen` (~280), the reroll listener (~841)

**Interfaces:**
- Consumes: `jecCurrentWord`, `jecCurrentWord2`, `jecInstruction`, `jecDrawOrders`, `jecDrawInstruction`.
- Produces: `jecRenderOrder()` — repaints the whole Order stage from state. Called by `jecShowOrderScreen` **and** the reroll listener, so a reroll cannot repaint the word while leaving a stale instruction beneath it.

**New element IDs:** `jec-order-word2`, `jec-order-fusion-plus`, `jec-order-instruction`.

- [ ] **Step 1: Rewrite the Order stage markup**

Node script, anchored between `<section id="screen-jec-order"` and the closing `</section>` before `<!-- JEC PREP screen`. Replace the `<div>` holding "Today's Order:" + `jec-order-word` with:

```html
    <div class="w-full">
      <p class="text-stone-400 text-sm font-semibold uppercase tracking-widest mb-2">Today's Order:</p>
      <h2 id="jec-order-word" class="text-5xl font-bold text-amber-500 uppercase tracking-wide"></h2>
      <!-- Fusion Cuisine: the second Order. Hidden entirely in standard play. -->
      <p id="jec-order-fusion-plus" style="display:none" class="text-2xl font-bold text-amber-400 my-1">+</p>
      <h2 id="jec-order-word2" style="display:none" class="text-5xl font-bold text-amber-500 uppercase tracking-wide"></h2>
      <!-- Special Instructions: one modifier per Order, never stacked. -->
      <p id="jec-order-instruction" style="display:none" class="text-stone-600 text-lg italic mt-3"></p>
    </div>
```

Also update the standing line below the reroll button so it names the Fusion beat when it applies — leave the static copy as-is and let `jecRenderOrder` set it:

```html
    <p id="jec-order-hint" class="text-stone-500 text-sm leading-relaxed">Everyone read this together — each Chef will take a turn.</p>
```

- [ ] **Step 2: Write `jecRenderOrder`**

Replace `jecShowOrderScreen` in `js/games/jec.js`:

```js
// Repaints the whole Order stage from state. Called by jecShowOrderScreen AND by
// the Specials Board reroll — one function, so a reroll can never repaint the
// word while leaving a stale instruction sitting under it.
function jecRenderOrder() {
  document.getElementById('jec-order-word').textContent  = jecCurrentWord.toUpperCase();
  document.getElementById('jec-order-round').textContent = `Course ${jecRound} of ${jecRounds}`;

  const plus  = document.getElementById('jec-order-fusion-plus');
  const word2 = document.getElementById('jec-order-word2');
  const isFusion = jecFusionCuisine && !!jecCurrentWord2;
  plus.style.display  = isFusion ? '' : 'none';
  word2.style.display = isFusion ? '' : 'none';
  if (isFusion) word2.textContent = jecCurrentWord2.toUpperCase();

  const instr = document.getElementById('jec-order-instruction');
  instr.style.display = jecInstruction ? '' : 'none';
  instr.textContent   = jecInstruction;

  document.getElementById('jec-order-hint').textContent = isFusion
    ? 'One dish, two Orders. Prep for the mash-up — and give it a name.'
    : 'Everyone read this together — each Chef will take a turn.';
  document.getElementById('btn-jec-reroll').style.display = jecSpecialsBoard ? '' : 'none';
}

function jecShowOrderScreen() {
  jecRenderOrder();
  showScreen('screen-jec-order');
}
```

- [ ] **Step 3: Fix the reroll listener**

Replace the body of the `btn-jec-reroll` listener (~841) with:

```js
document.getElementById('btn-jec-reroll').addEventListener('click', () => {
  playWhoosh();
  // A Specials Board reroll redraws the Instruction with the Order — and in
  // Fusion, BOTH Orders. Rerolling one but not the others would let a table
  // fish for an easy instruction against a fixed dish.
  jecDrawOrders();
  jecDrawInstruction();
  jecRenderOrder();
  if (window.syllyMultiplayerMode === 'host') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'JEC_ORDER',
      word: jecCurrentWord, word2: jecCurrentWord2 || '',
      instruction: jecInstruction || '', round: jecRound, rounds: jecRounds,
    }});
  }
});
```

**This closes a live gap:** today's reroll listener never broadcasts, so in a lobby session the host rerolls and every client keeps prepping against the old word. Host-gate the button too — add to `jecRenderOrder`:

```js
  const reroll = document.getElementById('btn-jec-reroll');
  reroll.style.display = (jecSpecialsBoard && window.syllyMultiplayerMode !== 'client') ? '' : 'none';
```

(replacing the plain `jecSpecialsBoard` line above).

- [ ] **Step 4: Also fix the round label everywhere**

"Round N of M" becomes "Course N of M" across the game, since the setting is now Courses. Grep and update: `jec-order-round`, `jec-prep-round-label`, `jec-sifting-round-label`, `jec-tally-round-label`, and the Cook Book's `Round ${i + 1}` (→ `Course ${i + 1}`).

- [ ] **Step 5: Add the reroll assertion to the loopback and verify**

Append to `tools/verify-jec-loopback.js`:

```js
// A Specials Board reroll must reach the clients. Before this, the host rerolled
// and every client kept prepping against the previous word.
host.__seat({ players: 3, golden: 30, specials: true, instructions: true, fusion: true });
host.__startRound();
deliver(host, client, host.__lastSent('JEC_ORDER'));
const before = client.__state().word;
host.__reroll();
const after = host.__lastSent('JEC_ORDER');
check('reroll broadcasts JEC_ORDER', !!after, true);
deliver(host, client, after);
check('client followed the reroll', client.__state().word, host.__state().word);
check('reroll redrew word2',        client.__state().word2, host.__state().word2);
check('reroll redrew instruction',  client.__state().instruction, host.__state().instruction);
check('no throw on reroll',         client.__errors, []);
```

Run: `node tools/verify-jec-loop.js && node tools/verify-jec-loopback.js`
Expected: both exit 0.

Mojibake check after the Node edit:
```bash
node -e "const s=require('fs').readFileSync('index.html','utf8'); const b=s.match(/â€|Ã©|ï¿½/g); console.log('mojibake hits:', b?b.length:0);"
```
Expected: 0.

Then `visual-check` `screen-jec-order` in three states: standard with no instruction, standard with an instruction, and Fusion with two Orders **and** an instruction (the tallest case — confirm nothing overflows the Stack at 360 px width).

- [ ] **Step 6: Commit**

```bash
git add index.html js/games/jec.js
git commit -m "feat(jec): Order screen renders the Instruction and the Fusion pairing

One jecRenderOrder repaints the whole stage, so a Specials Board reroll cannot
repaint the word while leaving a stale instruction under it. A reroll now redraws
the Instruction and, in Fusion, both Orders.

Also closes a live lobby gap: the reroll never broadcast, so a host reroll left
every client prepping against the previous word. The button is now host-gated and
sends JEC_ORDER. Round N of M reads Course N of M throughout, per the setting."
```

---

## Task 9: The Prep screen — Signature tap, Call the Crutch, the Fusion name

The Chef types three ingredients, **taps one** to nominate as their Signature Dish, and calls The Crutch. In Fusion, they also name the dish — folded into the same pass, which is what costs the mode **+0 handoffs**.

**Files:**
- Modify: `index.html` ~2330–2385 (`screen-jec-prep`) — **Node script**
- Modify: `js/games/jec.js` — `jecStartPlayerPrep` (~287), `jecSubmitIngredients` (~316)

**Interfaces:**
- Consumes: `jecPrepSignatureIdx`, `jecHostResolveSifting` (Task 6), `jecWireArr`.
- Produces:
  - `jecSetPrepSignature(idx)` — sets `jecPrepSignatureIdx`, repaints the three ingredient rows, re-runs `jecUpdateServeState()`
  - `jecUpdateServeState()` — enables/disables `btn-jec-serve`; the CTA is blocked until three ingredients, a Signature tap **and** a Crutch are present (and, in Fusion, a name)

**New element IDs:** `jec-prep-sig-1/2/3` (the three tap targets), `jec-prep-crutch`, `jec-prep-crutch-section`, `jec-prep-fusion-section`, `jec-prep-fusion-name`, `jec-prep-order-word2`, `jec-prep-order-plus`, `jec-prep-instruction`.

- [ ] **Step 1: Rewrite the prep markup**

Replace the ingredient block, delete the whole `jec-prep-kn-section` (Poison Word), and add the two new sections. Each ingredient row becomes an input plus a Signature tap target:

```html
      <div class="w-full">
        <p class="text-stone-500 text-sm font-semibold mb-1">Prep your Ingredients!</p>
        <h2 id="jec-prep-chef-name" class="text-xl font-bold text-stone-800 mb-1"></h2>
        <p class="text-stone-400 text-xs mb-3">Tap the ⭐ on the one you're backing — your Signature Dish scores double if it lands.</p>
        <div class="flex flex-col gap-3 w-full">
          <div class="flex items-center gap-2">
            <input type="text" maxlength="30" placeholder="Ingredient 1" id="jec-prep-ingredient-1" autocomplete="off"
              class="flex-1 rounded-xl border-2 border-stone-200 bg-white px-4 py-3 text-base text-stone-800 placeholder-stone-300 focus:border-amber-400 focus:outline-none transition-colors" />
            <button id="jec-prep-sig-1" data-jec-sig="0" aria-label="Nominate ingredient 1 as your Signature Dish"
              class="jec-sig-btn min-h-11 min-w-11 rounded-xl bg-stone-100 text-lg active:scale-95 transition-transform duration-100">⭐</button>
          </div>
          <!-- rows 2 and 3 are identical with -2 / -3 and data-jec-sig="1" / "2" -->
        </div>
      </div>

      <!-- The Crutch — always on in standard play; it is not a setting. -->
      <div id="jec-prep-crutch-section" class="w-full flex flex-col gap-2">
        <p class="text-stone-500 text-sm font-semibold">Call the Crutch</p>
        <input type="text" maxlength="30" placeholder="The one everyone leans on…" id="jec-prep-crutch" autocomplete="off"
          class="w-full rounded-xl border-2 border-amber-300 bg-white px-4 py-3 text-base text-stone-800 placeholder-stone-300 focus:border-amber-500 focus:outline-none transition-colors" />
        <p class="text-stone-400 text-xs">Every kitchen has one. Call the culinary cliché everyone leans on.</p>
      </div>

      <!-- Fusion Cuisine — Name the Dish, folded into the same pass as the prep. -->
      <div id="jec-prep-fusion-section" style="display:none" class="w-full flex flex-col gap-2">
        <p class="text-stone-500 text-sm font-semibold">Name the Dish</p>
        <input type="text" maxlength="40" placeholder="What are we calling this?" id="jec-prep-fusion-name" autocomplete="off"
          class="w-full rounded-xl border-2 border-amber-300 bg-white px-4 py-3 text-base text-stone-800 placeholder-stone-300 focus:border-amber-500 focus:outline-none transition-colors" />
        <p class="text-stone-400 text-xs">Best name gets voted On the Menu — and takes half a jackpot.</p>
      </div>
```

The Order header on this screen mirrors the Order screen's Fusion + Instruction shape — add `jec-prep-order-plus`, `jec-prep-order-word2` and `jec-prep-instruction` beside the existing `jec-prep-order-word`, same hidden-by-default pattern.

Add the Signature-selected style to `css/styles.css` beside `.jec-range`:

```css
/* Signature Dish nomination — the tapped ⭐ on the prep screen. Transform and
   colour only; the row's layout must not shift when a Chef changes their mind. */
.jec-sig-btn          { transition: background-color 150ms ease, transform 100ms ease; }
.jec-sig-btn-on       { background-color: #fbbf24; }   /* amber-400 */
```

- [ ] **Step 2: Rewrite `jecStartPlayerPrep`**

```js
function jecStartPlayerPrep(idx) {
  const name = jecPlayerNames[idx];
  document.getElementById('jec-prep-order-word').textContent  = jecCurrentWord.toUpperCase();
  document.getElementById('jec-prep-chef-name').textContent   = `${name}'s Prep 🧑‍🍳`;
  document.getElementById('jec-prep-round-label').textContent = `Course ${jecRound} of ${jecRounds}`;

  const isFusion = jecFusionCuisine && !!jecCurrentWord2;
  const plus  = document.getElementById('jec-prep-order-plus');
  const word2 = document.getElementById('jec-prep-order-word2');
  plus.style.display  = isFusion ? '' : 'none';
  word2.style.display = isFusion ? '' : 'none';
  if (isFusion) word2.textContent = jecCurrentWord2.toUpperCase();

  const instr = document.getElementById('jec-prep-instruction');
  instr.style.display = jecInstruction ? '' : 'none';
  instr.textContent   = jecInstruction;

  ['1', '2', '3'].forEach(n => { document.getElementById(`jec-prep-ingredient-${n}`).value = ''; });
  document.getElementById('jec-prep-crutch').value = '';
  document.getElementById('jec-prep-fusion-name').value = '';
  document.getElementById('jec-prep-fusion-section').style.display = isFusion ? '' : 'none';
  document.getElementById('jec-prep-error').textContent = '';

  jecPrepSignatureIdx = -1;
  jecSetPrepSignature(-1);

  document.getElementById('jec-prep-phase').style.display = '';
  document.getElementById('jec-pass-gate').style.display  = 'none';
  showScreen('screen-jec-prep');
}

// The Signature tap. Nomination is MANDATORY — there is no default, because a
// default is not a decision, and this is the game's first genuine trade-off:
// back the word you're confident about, or gamble the double on the weird one.
function jecSetPrepSignature(idx) {
  jecPrepSignatureIdx = idx;
  document.querySelectorAll('[data-jec-sig]').forEach(b => {
    const on = parseInt(b.dataset.jecSig, 10) === idx;
    b.className = `jec-sig-btn min-h-11 min-w-11 rounded-xl text-lg active:scale-95 transition-transform duration-100 ${on ? 'jec-sig-btn-on' : 'bg-stone-100'}`;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  jecUpdateServeState();
}

// Serve it Up! is blocked until every required field is present — the Signature
// tap is gated exactly as the three ingredients are.
function jecUpdateServeState() {
  const vals = ['1', '2', '3'].map(n => document.getElementById(`jec-prep-ingredient-${n}`).value.trim());
  const crutch = document.getElementById('jec-prep-crutch').value.trim();
  const isFusion = jecFusionCuisine && !!jecCurrentWord2;
  const name = document.getElementById('jec-prep-fusion-name').value.trim();
  const ok = vals.every(Boolean) && jecPrepSignatureIdx >= 0 && !!crutch && (!isFusion || !!name);
  const btn = document.getElementById('btn-jec-serve');
  btn.disabled = !ok;
  btn.style.opacity = ok ? '' : '0.5';
}
```

Wire the listeners near the other prep listeners:

```js
document.querySelectorAll('[data-jec-sig]').forEach(btn => btn.addEventListener('click', () => {
  playPillClick();
  jecSetPrepSignature(parseInt(btn.dataset.jecSig, 10));
}));
['jec-prep-ingredient-1', 'jec-prep-ingredient-2', 'jec-prep-ingredient-3',
 'jec-prep-crutch', 'jec-prep-fusion-name'].forEach(id => {
  document.getElementById(id).addEventListener('input', jecUpdateServeState);
});
```

- [ ] **Step 3: Rewrite `jecSubmitIngredients`**

```js
function jecSubmitIngredients() {
  const v = ['1', '2', '3'].map(n => document.getElementById(`jec-prep-ingredient-${n}`).value.trim());
  const crutch   = document.getElementById('jec-prep-crutch').value.trim();
  const isFusion = jecFusionCuisine && !!jecCurrentWord2;
  const name     = isFusion ? document.getElementById('jec-prep-fusion-name').value.trim() : '';
  const err      = document.getElementById('jec-prep-error');

  if (!v.every(Boolean))       { err.textContent = 'Add all 3 ingredients before serving!'; return; }
  const norms = v.map(x => normaliseWord(x));
  if (new Set(norms).size < 3) { err.textContent = "You've already prepped that! Try a different ingredient. 🤔"; return; }
  if (jecPrepSignatureIdx < 0) { err.textContent = 'Tap the ⭐ on your Signature Dish first!'; return; }
  if (!crutch)                 { err.textContent = 'Call the Crutch before you serve!'; return; }
  // Same validation the Poison Word had, for the same reason: calling your own
  // ingredient is not a read of the table.
  if (norms.includes(normaliseWord(crutch))) {
    err.textContent = "That's one of your own — call something you didn't write. 📣"; return;
  }
  if (isFusion && !name)       { err.textContent = 'Give the dish a name before you serve!'; return; }

  const idx = window.syllyMultiplayerMode !== 'single' ? mpMyPlayerIdx : jecCurrentPlayerIdx;
  jecInputs[idx]      = v;
  jecCrutches[idx]    = crutch;
  jecSignatures[idx]  = jecPrepSignatureIdx;
  jecFusionNames[idx] = name;

  if (window.syllyMultiplayerMode !== 'single') {
    mpLockSync();
    document.getElementById('btn-jec-serve').classList.add('opacity-50', 'pointer-events-none');
    err.textContent = 'Ingredients submitted — waiting for the other chefs…';
    if (window.syllyMultiplayerMode === 'host') {
      // The host processes its OWN submission directly. mpHandleEnvelope drops
      // every envelope where originId === syllyDeviceUid, so a host that sent
      // itself an ACTION would never have its slot set and the round would hang.
      // That is bug J1, and it applies identically to the vote matrix.
      jecMpReadyCheck[mpMyPlayerIdx] = true;
      if (jecMpReadyCheck.every(Boolean)) jecHostResolveSifting();
    } else {
      mpSendEnvelope({ type: 'ACTION', payload: {
        action: 'JEC_PREP_SUBMIT',
        playerIdx:   mpMyPlayerIdx,
        ingredients: v,
        crutch,                                  // '' is impossible here — validated above
        signatureIdx: jecPrepSignatureIdx,       // 0 is a legitimate value and survives the wire
        fusionName:  name,                       // '' when not Fusion, never null
      }});
    }
    return;
  }

  const nextIdx = jecCurrentPlayerIdx + 1;
  if (nextIdx < jecPlayerCount) {
    document.getElementById('jec-pass-gate-next-name').textContent = jecPlayerNames[nextIdx];
    document.getElementById('jec-prep-phase').style.display = 'none';
    document.getElementById('jec-pass-gate').style.display  = '';
    jecCurrentPlayerIdx = nextIdx;
  } else {
    jecBuildFrequency();
    jecStartSifting();
  }
}
```

Delete the now-dead `jecAfterAllPlayersSubmit`.

- [ ] **Step 4: Add validation assertions to the loopback**

```js
// The Crutch must not be one of your own three ingredients.
check('self-crutch rejected', client.__tryPrep({
  ingredients: ['cheese','ham','basil'], crutch: 'cheese', signatureIdx: 0, fusionName: '' }).ok, false);
check('valid prep accepted', client.__tryPrep({
  ingredients: ['cheese','ham','basil'], crutch: 'tomato', signatureIdx: 0, fusionName: '' }).ok, true);
// Nomination is mandatory: no default, no fallback to slot 0.
check('missing signature rejected', client.__tryPrep({
  ingredients: ['cheese','ham','basil'], crutch: 'tomato', signatureIdx: -1, fusionName: '' }).ok, false);
// In Fusion the name is mandatory too.
client.__seat({ players: 3, fusion: true });
check('fusion requires a name', client.__tryPrep({
  ingredients: ['cheese','ham','basil'], crutch: 'tomato', signatureIdx: 0, fusionName: '' }).ok, false);
```

- [ ] **Step 5: Verify**

```bash
node tools/verify-jec-loop.js && node tools/verify-jec-loopback.js
node -e "const s=require('fs').readFileSync('index.html','utf8'); const b=s.match(/â€|Ã©|ï¿½/g); console.log('mojibake hits:', b?b.length:0);"
```
Expected: exit 0 on both; 0 mojibake hits.

`visual-check` `screen-jec-prep` in Fusion with an Instruction (the tallest state) at 360 px — confirm the ⭐ buttons clear 44×44 px, sit on the same baseline as their input, and that the Stack scrolls as one unit rather than pinning the CTA.

- [ ] **Step 6: Commit**

```bash
git add index.html css/styles.css js/games/jec.js
git commit -m "feat(jec): prep screen gains the Signature tap, The Crutch and the name

Signature nomination is a tap, not extra typing, and is mandatory - Serve it Up!
is blocked until it is set, exactly as it is for the three ingredients. A default
would not be a decision, and this is the game's first genuine trade-off.

The Crutch replaces the Poison Word in the same field with the same
not-your-own-ingredient validation, inverted into a read of the table.

In Fusion the dish name is entered in the SAME pass as the ingredients, which is
what keeps the mode at +0 handoffs - only the vote is a new beat.

The host processes its own submission directly rather than self-sending an
ACTION, which is bug J1's shape and now applies to three more fields."
```

---

## Task 10: The Sifting — Sous Chef's Check → The Tasting

`screen-jec-sifting` gains two sub-states, mirroring how `screen-jec-prep` already works. **This is an integrity fix, not only pacing:** merging on top of a scored board let a Chef push a merge that raised their own count, with full knowledge of what it was worth. Blind merging removes the incentive entirely.

**Files:**
- Modify: `index.html` ~2388–2420 (`screen-jec-sifting`) — **Node script**
- Modify: `css/styles.css` — the Tasting stagger
- Modify: `js/games/jec.js` — `jecStartSifting`, `jecRenderSifting`, the proceed listener
- Modify: `js/engine-multiplayer.js` — new `JEC_TASTING` handler

**Interfaces:**
- Consumes: `jecBadge`, `jecCanOversee`, `jecSetAdvanceCta`, `jecCrutchHit`, `jecSiftingSubState`.
- Produces:
  - `jecShowSousChefCheck()` / `jecShowTasting()` — the two sub-state entries
  - `jecRenderCheckList()` — plain, unscored, **alphabetical** list; no counts, no badges, no Callouts
  - `jecRenderTasting()` — counts, badges, Callouts, Signature markers, revealed in **ascending count order** with a stagger
  - `JEC_TASTING` SYNC packet

**New element IDs:** `jec-sifting-check`, `jec-sifting-tasting`, `jec-check-list`, `jec-tasting-list`, `jec-callouts-section`, `jec-callouts-list`, `btn-jec-check-proceed`, `jec-sifting-stage-label`.

- [ ] **Step 1: Rewrite the sifting markup as two sub-states**

Delete `jec-sifting-poison-section` entirely. The two sub-states are sibling `<div>`s inside the Stack, toggled by `display` — same shape as `jec-prep-phase` / `jec-pass-gate`:

```html
    <p id="jec-sifting-stage-label" class="text-sm font-bold text-stone-700 text-center w-full"></p>

    <!-- Sub-state A: Sous Chef's Check — plain, unscored, alphabetical, BLIND -->
    <div id="jec-sifting-check" style="display:none" class="w-full flex flex-col gap-4">
      <div id="jec-oversight-hint" class="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center">
        <p class="text-amber-700 text-xs font-semibold">Tap two ingredients that are the same thing to merge them.</p>
      </div>
      <div id="jec-check-list" class="flex flex-col gap-3 w-full"></div>
      <button id="btn-jec-check-proceed" class="min-h-14 w-full rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xl font-semibold transition-all duration-150">
        Start the Tasting
      </button>
    </div>

    <!-- Sub-state B: The Tasting — counts, badges, Callouts -->
    <div id="jec-sifting-tasting" style="display:none" class="w-full flex flex-col gap-4">
      <div id="jec-tasting-list" class="flex flex-col gap-3 w-full"></div>
      <!-- The Callouts reveal AFTER the ingredient list has finished — the Crutch
           result is the round's punchline, not its preamble. -->
      <div id="jec-callouts-section" style="display:none" class="w-full flex flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-widest text-amber-500">The Callouts</p>
        <div id="jec-callouts-list" class="flex flex-col gap-2"></div>
      </div>
      <button id="btn-jec-sifting-proceed" class="min-h-14 w-full rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xl font-semibold transition-all duration-150">
        The Tally
      </button>
    </div>
```

Rename the header eyebrow from the static "The Sifting" — `jec-sifting-stage-label` now carries the live sub-state name.

- [ ] **Step 2: Add the stagger CSS**

Append to `css/styles.css` beside the `.jec-sig-btn` rules. Motion Standard: `transform`/`opacity` only, ≤ 300 ms per row, 30–80 ms stagger. The global `prefers-reduced-motion` block already collapses this to 0.01 ms — do **not** add a second block:

```css
/* The Tasting's staged reveal. Ingredients arrive in ASCENDING count order —
   Table for One first, Chef's Kisses landing in the middle where the reactions
   are, Too Many Cooks last. Same data as the old static table, staged. */
.jec-tasting-row {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 220ms ease-out, transform 220ms ease-out;
}
.jec-tasting-row-in { opacity: 1; transform: translateY(0); }
```

Rows get their delay inline via `style.transitionDelay` (50 ms × index) rather than a CSS nth-child ladder, so any row count works.

- [ ] **Step 3: Write the two render functions**

```js
function jecStartSifting() {
  document.getElementById('jec-sifting-order').textContent = jecFusionCuisine && jecCurrentWord2
    ? `${jecCurrentWord.toUpperCase()} + ${jecCurrentWord2.toUpperCase()}`
    : jecCurrentWord.toUpperCase();
  document.getElementById('jec-sifting-round-label').textContent = `Course ${jecRound} of ${jecRounds}`;
  // Sous Chef's Check is skipped WHOLE when the setting is OFF.
  if (jecSousChefCheck) jecShowSousChefCheck(); else jecShowTasting();
  showScreen('screen-jec-sifting');
}

// Sub-state A. Plain, unscored, alphabetical. No counts, no badges, no Callouts.
// Merging blind is the whole point: on the old scored board a Chef could push a
// merge that raised their own count, with full knowledge of what it was worth.
function jecShowSousChefCheck() {
  jecSiftingSubState = 'check';
  document.getElementById('jec-sifting-stage-label').textContent = "Sous Chef's Check";
  document.getElementById('jec-sifting-check').style.display   = '';
  document.getElementById('jec-sifting-tasting').style.display = 'none';
  document.getElementById('jec-oversight-hint').style.display  = jecCanOversee() ? '' : 'none';
  jecRenderCheckList();
  jecSetAdvanceCta('btn-jec-check-proceed', 'Start the Tasting');
}

function jecRenderCheckList() {
  const list = document.getElementById('jec-check-list');
  list.innerHTML = '';
  Object.keys(jecWordFrequency)
    .map(norm => [norm, (jecDisplayWords[norm] || norm)])
    .sort((a, b) => a[1].localeCompare(b[1]))     // alphabetical, NOT by count
    .forEach(([norm, raw]) => {
      const card = document.createElement('div');
      card.className = `jec-sift-card bg-white rounded-2xl p-4 shadow-sm flex items-center${jecCanOversee() ? ' cursor-pointer active:scale-95 transition-transform duration-100' : ''}`;
      card.dataset.norm = norm;
      card.innerHTML = `<p class="font-semibold text-stone-800">${raw.charAt(0).toUpperCase() + raw.slice(1)}</p>`;
      if (jecCanOversee()) card.addEventListener('click', () => jecHandleOversightTap(norm));
      list.appendChild(card);
    });
}

// Sub-state B. Counts, badges, Signature markers and the Callouts — revealed in
// ASCENDING count order so the Chef's Kisses land in the middle, where the
// reactions are, and Too Many Cooks lands last.
function jecShowTasting() {
  jecSiftingSubState = 'tasting';
  document.getElementById('jec-sifting-stage-label').textContent = 'The Tasting';
  document.getElementById('jec-sifting-check').style.display   = 'none';
  document.getElementById('jec-sifting-tasting').style.display = '';
  jecRenderTasting();
  jecSetAdvanceCta('btn-jec-sifting-proceed', 'The Tally');
}

function jecRenderTasting() {
  const list = document.getElementById('jec-tasting-list');
  list.innerHTML = '';
  const entries = Object.entries(jecWordFrequency).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
  // Which Chefs nominated which surviving word — one ⭐ marker per nomination.
  const sigCounts = {};
  for (let p = 0; p < jecPlayerCount; p++) {
    const j = jecSignatures[p];
    if (j < 0 || !jecInputs[p] || !jecInputs[p][j]) continue;
    const n = jecResolveNorm(jecInputs[p][j]);
    sigCounts[n] = (sigCounts[n] || 0) + 1;
  }

  entries.forEach(([norm, count], i) => {
    const badge   = jecBadge(count, jecPlayerCount);
    const raw     = jecDisplayWords[norm] || norm;
    const display = raw.charAt(0).toUpperCase() + raw.slice(1);
    const chefs   = count === 1 ? '1 Chef' : `${count} Chefs`;
    const stars   = sigCounts[norm] ? ' ' + '⭐'.repeat(sigCounts[norm]) : '';
    const card = document.createElement('div');
    card.className = 'jec-tasting-row bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between';
    card.style.transitionDelay = `${Math.min(i * 50, 600)}ms`;
    card.innerHTML = `
      <div>
        <p class="font-semibold text-stone-800">${display}${stars}</p>
        <p class="text-xs text-stone-400 mt-0.5">${chefs}</p>
      </div>
      <span class="px-3 py-1 rounded-full text-xs font-bold ${badge.cls}">${badge.label}</span>`;
    list.appendChild(card);
  });

  // Kick the stagger on the next frame so the initial (hidden) state paints first.
  requestAnimationFrame(() => {
    document.querySelectorAll('.jec-tasting-row').forEach(el => el.classList.add('jec-tasting-row-in'));
  });

  jecRenderCallouts(entries.length);
}

// The Callouts reveal AFTER the ingredient list has finished. The Crutch result
// is the round's punchline, not its preamble.
function jecRenderCallouts(rowCount) {
  const section = document.getElementById('jec-callouts-section');
  const list    = document.getElementById('jec-callouts-list');
  const called  = [];
  for (let p = 0; p < jecPlayerCount; p++) {
    const c = (jecCrutches[p] || '').trim();
    if (c) called.push({ p, word: c, hit: jecCrutchHit(p) });
  }
  if (!called.length) { section.style.display = 'none'; return; }
  list.innerHTML = '';
  called.forEach(({ p, word, hit }) => {
    const row = document.createElement('div');
    row.className = 'bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between';
    row.innerHTML = `
      <div>
        <p class="font-semibold text-stone-800">${jecPlayerNames[p]}</p>
        <p class="text-xs text-stone-400 mt-0.5">${word.charAt(0).toUpperCase() + word.slice(1)}</p>
      </div>
      <span class="px-3 py-1 rounded-full text-xs font-bold ${hit ? 'bg-amber-100 text-amber-700' : 'bg-stone-50 text-stone-400'}">${hit ? 'Called It! 📣' : 'Not this time'}</span>`;
    list.appendChild(row);
  });
  section.style.display = 'none';
  // Clear any pending handle first — a rapid re-render must never stack two
  // timers (§ Timer Lifecycle). jecCalloutHandle is cleared in the quit handler
  // and in resetToLobby().
  if (jecCalloutHandle) { clearTimeout(jecCalloutHandle); jecCalloutHandle = null; }
  jecCalloutHandle = setTimeout(() => {
    section.style.display = '';
    jecCalloutHandle = null;
  }, Math.min(rowCount * 50, 600) + 300);
}
```

Declare `let jecCalloutHandle = null;` in the state block and clear it in **all three** places per § Timer Lifecycle: the quit-confirm handler, `resetToLobby()` in `js/engine.js`, and `jecResetForNewGame()`.

- [ ] **Step 4: Wire the sub-state advance and its packet**

Sous Chef's Check → The Tasting is a **host-gated advance** (J4). Add the listener:

```js
document.getElementById('btn-jec-check-proceed').addEventListener('click', () => {
  if (window.syllyMultiplayerMode === 'client') return;   // J4
  playSuccess();
  if (window.syllyMultiplayerMode === 'host') {
    // The merges are already reflected on clients via JEC_MERGE; this packet
    // carries the final state once more so a client that missed a merge is
    // repaired before anything is scored.
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'JEC_TASTING',
      jecWordFrequency: { ...jecWordFrequency },
      jecDisplayWords:  { ...jecDisplayWords },
      jecMergeMap:      { ...jecMergeMap },
    }});
  }
  jecShowTasting();
});
```

Handler in `jecHandleEnvelope`:

```js
    // JEC_TASTING — host advanced Sous Chef's Check -> The Tasting
    if (env.type === 'SYNC' && env.payload.action === 'JEC_TASTING') {
      const p = env.payload;
      jecWordFrequency = jecWireObj(p.jecWordFrequency);
      jecDisplayWords  = jecWireObj(p.jecDisplayWords);
      jecMergeMap      = jecWireObj(p.jecMergeMap);
      jecShowTasting();
    }
```

Update `jecHandleOversightTap`'s early return: merging is only legal during the Check sub-state now.

```js
function jecHandleOversightTap(norm) {
  if (window.syllyMultiplayerMode === 'client') return;      // J3
  if (jecSiftingSubState !== 'check') return;                 // merging is blind, or not at all
  /* …unchanged… */
}
```

And in `jecApplyMerge`'s post-merge re-render, call `jecRenderCheckList()` rather than the old `jecRenderSifting()`. Delete `jecRenderSifting` once nothing references it; point the `JEC_MERGE` handler at `jecRenderCheckList()`.

- [ ] **Step 5: Add loopback assertions**

```js
// ── Sous Chef's Check -> The Tasting ──────────────────────────────────────────
// Blind merging is an INTEGRITY fix: the client's Check list must carry no
// counts, so a merge cannot be pushed with knowledge of what it is worth.
host.__seat({ players: 3, golden: 30, souschef: true });
client.__seat({ players: 3, golden: 30, souschef: true });
host.__runPrepAll([['tomato','a1','a2'], ['tomatoe','b1','b2'], ['c0','c1','c2']],
                  ['', '', ''], [0, 0, 0]);
deliver(host, client, host.__lastSent('JEC_SIFTING'));
check('client lands on the Check',  client.__state().subState, 'check');
check('Check list carries no counts',
  client.__el('jec-check-list').children.every(c => !/Chef/.test(c.innerHTML)), true);

host.__merge('tomato', 'tomatoe');
deliver(host, client, host.__lastSent('JEC_MERGE'));
check('client applied the merge', client.__state().freq[client.__norm('tomato')], 2);

env = host.__lastSentAfter(host.__advanceCheck(), 'JEC_TASTING');
check('JEC_TASTING sent', !!env, true);
deliver(host, client, env);
check('client reached the Tasting', client.__state().subState, 'tasting');
check('Tasting rows rendered',      client.__el('jec-tasting-list').children.length > 0, true);
check('no throw on JEC_TASTING',    client.__errors, []);

// Sous Chef Check OFF skips the sub-state WHOLE — not a Check screen with the
// merge affordance hidden.
host.__seat({ players: 3, golden: 30, souschef: false });
client.__seat({ players: 3, golden: 30, souschef: false });
host.__runPrepAll([['a0','a1','a2'], ['b0','b1','b2'], ['c0','c1','c2']], ['','',''], [0,0,0]);
deliver(host, client, host.__lastSent('JEC_SIFTING'));
check('OFF goes straight to the Tasting', client.__state().subState, 'tasting');

// The Callouts render for every Chef who called, hit or miss.
host.__seat({ players: 4, golden: 30, souschef: false });
client.__seat({ players: 4, golden: 30, souschef: false });
host.__runPrepAll([['cheese','a1','a2'], ['cheese','b1','b2'], ['cheese','c1','c2'], ['d0','d1','d2']],
                  ['', '', '', 'cheese'], [0,0,0,0]);
deliver(host, client, host.__lastSent('JEC_SIFTING'));
check('one callout row', client.__el('jec-callouts-list').children.length, 1);
check('callout marked as a hit',
  /Called It/.test(client.__el('jec-callouts-list').children[0].innerHTML), true);
```

The harness's mock element needs `requestAnimationFrame` in the sandbox — add `requestAnimationFrame: fn => { fn(); return 1; }` and `cancelAnimationFrame: () => {}` to `makeDevice`'s sandbox, running the callback synchronously so the stagger class is applied by the time assertions read it.

- [ ] **Step 6: Verify**

```bash
node tools/verify-jec-loop.js && node tools/verify-jec-loopback.js
node -e "const s=require('fs').readFileSync('index.html','utf8'); const b=s.match(/â€|Ã©|ï¿½/g); console.log('mojibake hits:', b?b.length:0);"
```
Expected: exit 0 both; 0 mojibake.

`visual-check` both sub-states at 6 players (the longest list): confirm the Check list is alphabetical with no badges, the Tasting list is ascending by count, and the Callouts sit below it. Then re-run with DevTools `prefers-reduced-motion: reduce` emulated — nothing should travel, and no row should be left at `opacity: 0`.

- [ ] **Step 7: Commit**

```bash
git add index.html css/styles.css js/games/jec.js js/engine-multiplayer.js
git commit -m "feat(jec): split The Sifting into Sous Chef's Check and The Tasting

An integrity fix, not only pacing. Merging happened on top of a SCORED board, so
a Chef could push a merge that raised their own count with full knowledge of what
it was worth. Sous Chef's Check is now a plain alphabetical list with no counts
and no badges - blind - and the setting being OFF skips the sub-state whole.

The Tasting reveals in ascending count order so Chef's Kisses land in the middle
where the reactions are and Too Many Cooks lands last, with a 50ms stagger on
transform and opacity only. The Callouts reveal after the list finishes: the
Crutch result is the round's punchline, not its preamble.

New JEC_TASTING SYNC repairs any client that missed a merge before anything is
scored. The callout timer is cleared in all three places per Timer Lifecycle."
```

---

## Task 11: Name the Dish — the vote screen

Fusion only. Runs **after The Tasting and before The Tally**, so The Tally shows the round's complete score including the name bonus — one score screen per round, not two.

**Files:**
- Create markup: `index.html` — `screen-jec-name-vote`, inserted after `screen-jec-sifting` (**Node script**)
- Modify: `js/engine.js:34-36` — **register the screen in `allScreens[]`**
- Modify: `js/games/jec.js` — the vote flow
- Modify: `js/engine-multiplayer.js` — `JEC_NAME_VOTE` / `JEC_NAME_RESULT`

**Interfaces:**
- Consumes: `jecTallyNameVotes` (Task 5), `jecMpVoteCheck`, `jecNameVotes`, `jecSetAdvanceCta`.
- Produces:
  - `jecStartNameVote()` — entry from the Tasting's proceed CTA when Fusion is on
  - `jecRenderBallot(voterIdx)` — one ballot; the voter's own entry renders **disabled, not hidden**
  - `jecCastNameVote(voterIdx, targetIdx)` — the branch point for PTP vs Lobby
  - `jecShowNameResult()` — the second sub-state; announces the winner(s)
  - Packets `JEC_NAME_VOTE` (ACTION, `{ playerIdx, votedForIdx }`) and `JEC_NAME_RESULT` (SYNC, `{ votes, winners, bonus }`)

**No pass gate.** The names are public, so there is nothing private to protect and `logic-engine.md` § Pass-the-Phone Safety Gate does not apply.

- [ ] **Step 1: Add the screen markup**

Insert after `screen-jec-sifting` closes. Standard Stack shape, with two sibling sub-states:

```html
  <!-- JEC NAME VOTE screen — Fusion Cuisine only: vote the best dish name On the Menu -->
  <section id="screen-jec-name-vote" style="display:none"
    class="flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">
    <div class="flex flex-col w-full max-w-sm gap-4">
      <div class="flex items-center justify-between">
        <p id="jec-name-vote-round-label" class="text-stone-400 text-xs font-semibold uppercase tracking-widest"></p>
        <div class="flex items-center gap-2">
          <button class="btn-jec-help-open w-10 h-10 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 active:scale-95 transition-all duration-150 text-stone-300 font-mono font-bold">?</button>
          <button class="btn-open-sound w-10 h-10 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 active:scale-95 transition-all duration-150 text-lg">🔊</button>
          <button id="btn-jec-name-vote-exit" class="w-10 h-10 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 active:scale-95 transition-all duration-150 text-stone-500 font-bold text-lg">✕</button>
        </div>
      </div>
      <div class="w-full text-center">
        <p class="text-stone-400 text-xs font-semibold uppercase tracking-widest">Name the Dish</p>
        <h2 id="jec-name-vote-fusion" class="text-2xl font-bold text-amber-500 uppercase tracking-wide mt-1"></h2>
      </div>

      <!-- Sub-state A: the ballot -->
      <div id="jec-name-vote-ballot" class="w-full flex flex-col gap-4">
        <h3 id="jec-name-vote-heading" class="text-xl font-bold text-stone-800 text-center"></h3>
        <div id="jec-name-vote-list" class="flex flex-col gap-3 w-full"></div>
        <p id="jec-name-vote-status" class="text-stone-400 text-sm text-center min-h-5"></p>
      </div>

      <!-- Sub-state B: the result -->
      <div id="jec-name-vote-result" style="display:none" class="w-full flex flex-col gap-4">
        <div class="text-5xl text-center" role="img" aria-label="Star">⭐</div>
        <h3 id="jec-name-vote-winner" class="text-2xl font-bold text-stone-800 text-center"></h3>
        <p id="jec-name-vote-winner-sub" class="text-stone-500 text-sm text-center"></p>
        <button id="btn-jec-name-vote-next" class="min-h-14 w-full rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xl font-semibold transition-all duration-150">
          The Tally
        </button>
      </div>
    </div>
  </section>
```

- [ ] **Step 2: Register the screen — this is not optional**

`js/engine.js` lines 34–36:

```js
  'screen-jec-menu', 'screen-jec-roster', 'screen-jec-order',
  'screen-jec-prep', 'screen-jec-sifting', 'screen-jec-name-vote',
  'screen-jec-tally', 'screen-jec-washup',
```

Per `logic-engine.md` § Screen Routing, an unregistered screen is never hidden by `showScreen` — it becomes a ghost overlaying every subsequent screen.

- [ ] **Step 3: Write the vote flow**

```js
// ── JEC Name the Dish (Fusion Cuisine) ───────────────────────────────────────
function jecStartNameVote() {
  document.getElementById('jec-name-vote-round-label').textContent = `Course ${jecRound} of ${jecRounds}`;
  document.getElementById('jec-name-vote-fusion').textContent =
    `${jecCurrentWord.toUpperCase()} + ${jecCurrentWord2.toUpperCase()}`;
  document.getElementById('jec-name-vote-ballot').style.display = '';
  document.getElementById('jec-name-vote-result').style.display = 'none';
  jecVoteCurrentIdx = window.syllyMultiplayerMode !== 'single' ? mpMyPlayerIdx : 0;
  jecRenderBallot(jecVoteCurrentIdx);
  showScreen('screen-jec-name-vote');
}

// One ballot. The voter's OWN entry renders DISABLED, not hidden, so the ballot
// reads the same for everyone — a hidden row would shift every other name up and
// make the list length itself a tell.
function jecRenderBallot(voterIdx) {
  document.getElementById('jec-name-vote-heading').textContent =
    window.syllyMultiplayerMode !== 'single'
      ? 'Pick the best name'
      : `${jecPlayerNames[voterIdx]}, pick the best name`;
  const list = document.getElementById('jec-name-vote-list');
  list.innerHTML = '';
  for (let p = 0; p < jecPlayerCount; p++) {
    const name = (jecFusionNames[p] || '').trim();
    if (!name) continue;                       // not on the ballot
    const own = p === voterIdx;
    const btn = document.createElement('button');
    btn.className = `btn-mp-action min-h-14 w-full rounded-2xl px-4 text-lg font-semibold transition-transform duration-100 ${
      own ? 'bg-stone-100 text-stone-400' : 'bg-white text-stone-800 shadow-sm active:scale-95'}`;
    btn.textContent = name;
    btn.disabled = own;
    if (!own) btn.addEventListener('click', () => { playPillClick(); jecCastNameVote(voterIdx, p); });
    list.appendChild(btn);
  }
  document.getElementById('jec-name-vote-status').textContent = '';
}

function jecCastNameVote(voterIdx, targetIdx) {
  if (voterIdx === targetIdx) return;          // belt and braces; the button is disabled
  jecNameVotes[voterIdx] = targetIdx;

  if (window.syllyMultiplayerMode === 'single') {
    // Pass-the-Phone: cycle through Chefs on the one device. No pass gate — the
    // names are public, so there is nothing private to protect.
    jecVoteCurrentIdx++;
    if (jecVoteCurrentIdx < jecPlayerCount) { jecRenderBallot(jecVoteCurrentIdx); return; }
    jecTallyNameVotes();
    jecShowNameResult();
    return;
  }

  document.getElementById('jec-name-vote-status').textContent = 'Vote in — waiting for the other chefs…';
  document.getElementById('jec-name-vote-list').classList.add('opacity-50', 'pointer-events-none');

  if (window.syllyMultiplayerMode === 'host') {
    // Host processes its OWN vote directly. mpHandleEnvelope drops every envelope
    // where originId === syllyDeviceUid, so a self-sent ACTION would leave this
    // slot false forever and the round would hang. Same shape as bug J1.
    jecMpVoteCheck[mpMyPlayerIdx] = true;
    jecHostCheckVotes();
  } else {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: {
      action: 'JEC_NAME_VOTE', playerIdx: mpMyPlayerIdx, votedForIdx: targetIdx,
    }});
  }
}

// The readiness gate. In Lobby Mode every seat is live, so a plain
// .every(Boolean) is correct — but [].every() is TRUE, so this must never run
// against an empty matrix. jecMpVoteCheck is set to length N in jecStartRound and
// in the JEC_ORDER applier; the guard below is what makes that explicit.
function jecHostCheckVotes() {
  if (jecMpVoteCheck.length !== jecPlayerCount) return;
  if (!jecMpVoteCheck.every(Boolean)) return;
  const r = jecTallyNameVotes();
  mpSendEnvelope({ type: 'SYNC', payload: {
    action: 'JEC_NAME_RESULT',
    votes:   [...r.votes],      // an all-0 array is a legitimate value; 0 survives
    winners: [...r.winners],    // MAY be empty — rebuilt to [] on receipt
    bonus:   r.bonus,
  }});
  mpUnlockSync();
  jecShowNameResult();
}

function jecShowNameResult() {
  document.getElementById('jec-name-vote-ballot').style.display = 'none';
  document.getElementById('jec-name-vote-result').style.display = '';
  const w   = jecNameWinners;
  const win = document.getElementById('jec-name-vote-winner');
  const sub = document.getElementById('jec-name-vote-winner-sub');
  if (!w.length) {
    win.textContent = 'No name made the menu.';
    sub.textContent = 'Nobody voted. Back to the pans.';
  } else if (w.length === 1) {
    win.textContent = jecFusionNames[w[0]];
    sub.textContent = `${jecPlayerNames[w[0]]} takes On the Menu! ⭐ — +${jecBonusValue()} pts`;
  } else {
    // Ties are NOT broken: every tied name takes the full bonus, because a tie
    // means two names were both funny and a runoff costs another pass for no gain.
    win.textContent = w.map(i => jecFusionNames[i]).join('  ·  ');
    sub.textContent = `A dead heat — every one of them goes On the Menu! ⭐ +${jecBonusValue()} pts each`;
  }
  jecSetAdvanceCta('btn-jec-name-vote-next', 'The Tally');
}
```

- [ ] **Step 4: Route the Tasting CTA through the vote**

Replace the `btn-jec-sifting-proceed` listener so Fusion detours via the vote:

```js
document.getElementById('btn-jec-sifting-proceed').addEventListener('click', () => {
  if (window.syllyMultiplayerMode === 'client') return;   // J4
  playSuccess();
  // Fusion: the vote runs BEFORE the Tally, so the Tally shows the round's
  // complete score including the name bonus — one score screen per round.
  if (jecFusionCuisine && jecCurrentWord2) {
    if (window.syllyMultiplayerMode === 'host') {
      mpSendEnvelope({ type: 'SYNC', payload: {
        action: 'JEC_NAME_VOTE_BEGIN',
        jecFusionNames: [...jecFusionNames],
      }});
    }
    jecStartNameVote();
    return;
  }
  jecFinishRoundToTally();
});
```

Add `jecFinishRoundToTally()`, shared by the standard path and the vote-result CTA — Task 12 fills its `JEC_TALLY` broadcast.

Add the `btn-jec-name-vote-next` listener (host-gated) calling `jecFinishRoundToTally()`, and `btn-jec-name-vote-exit` opening `jec-quit-overlay`.

- [ ] **Step 5: Add the three handlers**

```js
    // JEC_NAME_VOTE_BEGIN — clients enter the ballot with the host's name list
    if (env.type === 'SYNC' && env.payload.action === 'JEC_NAME_VOTE_BEGIN') {
      jecFusionNames = jecWireArr(env.payload.jecFusionNames, jecPlayerCount, '');
      jecNameVotes   = Array(jecPlayerCount).fill(-1);
      jecStartNameVote();
    }

    // JEC_NAME_VOTE — host collects; resolves when every Chef has voted
    if (env.type === 'ACTION' && env.payload.action === 'JEC_NAME_VOTE' &&
        window.syllyMultiplayerMode === 'host') {
      const { playerIdx, votedForIdx } = env.payload;
      // Only the HOST tallies. Clients are vote-interactive, so the J3 client
      // early-return applies to the RESOLUTION, not to the vote itself.
      if (playerIdx !== votedForIdx) jecNameVotes[playerIdx] = votedForIdx;
      jecMpVoteCheck[playerIdx] = true;
      jecHostCheckVotes();
    }

    // JEC_NAME_RESULT — all devices show the same winner(s)
    if (env.type === 'SYNC' && env.payload.action === 'JEC_NAME_RESULT') {
      const p = env.payload;
      // winners MAY be legitimately empty (nobody voted) — [] is erased in flight,
      // so jecWireList rebuilds it rather than leaving undefined.
      jecNameWinners = jecWireList(p.winners);
      mpUnlockSync();
      jecShowNameResult();
    }
```

`JEC_NAME_VOTE_BEGIN` is an addition beyond spec § 7.1's table — it is required because clients must be *told* to enter the ballot and must hold the same name list; the spec's `JEC_NAME_VOTE` is client→host only. Record this in the impl notes in Task 14.

- [ ] **Step 6: Add loopback assertions — both modes**

```js
// ── Name the Dish ─────────────────────────────────────────────────────────────
// The readiness gate must be asserted PER MODE. [].every() is true, so a gate
// written for one mode can be vacuously open in the other (CJAR BUG-05).
host.__seat({ players: 3, golden: 30, fusion: true });
client.__seat({ players: 3, golden: 30, fusion: true });
host.__runPrepAll([['a0','a1','a2'],['b0','b1','b2'],['c0','c1','c2']],
                  ['','',''], [0,0,0], ['Sushizza','Pizushi','Rice Pie']);
deliver(host, client, host.__lastSent('JEC_SIFTING'));
host.__advanceCheck();
deliver(host, client, host.__lastSent('JEC_TASTING'));
env = host.__lastSentAfter(host.__advanceTasting(), 'JEC_NAME_VOTE_BEGIN');
check('vote begin sent', !!env, true);
deliver(host, client, env);
check('client on the vote screen',
  client.__screens[client.__screens.length - 1], 'screen-jec-name-vote');
check('ballot lists all three names', client.__el('jec-name-vote-list').children.length, 3);
check('own entry is disabled, not hidden',
  client.__el('jec-name-vote-list').children[1].disabled, true);

// Host votes DIRECTLY, never by self-sending an ACTION.
host.__vote(0, 1);
check('host sent no self ACTION',
  host.__sent.filter(e => e.type === 'ACTION' && e.payload.action === 'JEC_NAME_VOTE').length, 0);
check('gate not yet open', !!host.__lastSent('JEC_NAME_RESULT'), false);

deliver(client, host, client.__vote(1, 0));
check('gate still closed at 2 of 3', !!host.__lastSent('JEC_NAME_RESULT'), false);
deliver(client, host, host.__fakeVote(2, 0));
env = host.__lastSent('JEC_NAME_RESULT');
check('gate opens at 3 of 3', !!env, true);
check('winner is chef 0',     env.payload.winners, [0]);
deliver(host, client, env);
check('client sees the winner',  client.__state().winners, [0]);
check('no throw on NAME_RESULT', client.__errors, []);

// Empty winners (nobody voted) is erased in flight and must rebuild to [].
check('empty winners rebuild to []', client.__applyResult({ votes: [0,0,0], winners: [], bonus: 15 }), []);

// Pass-the-Phone: the same gate, driven by cycling one device. This is the mode
// where a matrix-based gate would be vacuously open.
const solo = makeDevice('solo', 'single', 0, []);
solo.__seat({ players: 3, golden: 30, fusion: true });
solo.__runPrepAll([['a0','a1','a2'],['b0','b1','b2'],['c0','c1','c2']],
                  ['','',''], [0,0,0], ['Alpha','Bravo','Charlie']);
solo.__advanceTasting();
check('PTP starts on chef 0',   solo.__state().voteIdx, 0);
solo.__vote(0, 1);
check('PTP advanced to chef 1', solo.__state().voteIdx, 1);
solo.__vote(1, 0);
solo.__vote(2, 0);
check('PTP resolved after all 3', solo.__state().winners, [0]);
check('PTP showed the result',
  solo.__el('jec-name-vote-result').style.display, '');
```

- [ ] **Step 7: Verify**

```bash
node tools/verify-jec-loop.js && node tools/verify-jec-loopback.js && node tools/verify-mp-configs.js
node -e "const s=require('fs').readFileSync('index.html','utf8'); const b=s.match(/â€|Ã©|ï¿½/g); console.log('mojibake hits:', b?b.length:0);"
grep -n "screen-jec-name-vote" js/engine.js
```
Expected: all harnesses exit 0; 0 mojibake; the grep finds the screen in `allScreens[]`.

`visual-check` `screen-jec-name-vote` at 6 players (six ballot buttons) — confirm the disabled own-entry reads as unavailable rather than as a fifth option, and the Stack scrolls as one unit.

- [ ] **Step 8: Commit**

```bash
git add index.html js/engine.js js/games/jec.js js/engine-multiplayer.js
git commit -m "feat(jec): add the Name the Dish vote screen (Fusion Cuisine)

Runs after The Tasting and before The Tally, so the Tally shows the round's
complete score including the name bonus - one score screen per round, not two.

A Chef cannot vote for their own name; that entry renders DISABLED, not hidden,
so the ballot reads the same for everyone rather than making the list length a
tell. Ties are not broken - every tied name takes the full bonus.

No pass gate: the names are public, so there is nothing private to protect.

The host processes its own vote directly rather than self-sending an ACTION, and
the readiness gate is asserted in BOTH modes - [].every() is true, so a matrix
gate can be vacuously open in the mode that has no matrix.

screen-jec-name-vote is registered in allScreens[]."
```

---

## Task 12: The Tally — bonus breakdown, and the packet that carries it

`jecCalcRoundScores` now returns `{ roundScores, bonus }`. The Tally renders the breakdown, and `JEC_TALLY` carries it so clients render the same thing rather than a bare total.

**Files:**
- Modify: `index.html` ~2422–2440 (`screen-jec-tally`) and ~2617–2643 (`screen-jec-washup`) — **Node script**
- Modify: `js/games/jec.js` — `jecRenderTally`, `jecRenderCookBook`, `jecFinishRoundToTally`, `jecShowWashup`
- Modify: `js/engine-multiplayer.js` — `JEC_TALLY`, `JEC_WASHUP`

**Interfaces:**
- Consumes: `jecCalcRoundScores()` → `{ roundScores, bonus }`, `jecBonusValue`.
- Produces:
  - `jecFinishRoundToTally()` — scores the round, broadcasts `JEC_TALLY`, renders and navigates. Called from the standard Tasting CTA **and** the vote-result CTA.
  - `jecRenderTally(roundScores, bonus)` — **signature change**; both arguments required
  - `JEC_TALLY` payload gains `bonus`

- [ ] **Step 1: Write `jecFinishRoundToTally`**

```js
// Scores the round and moves to The Tally. Called from the standard Tasting CTA
// AND from the Fusion vote-result CTA — one function, so the two paths cannot
// score differently.
function jecFinishRoundToTally() {
  const { roundScores, bonus } = jecCalcRoundScores();
  if (window.syllyMultiplayerMode === 'host') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'JEC_TALLY',
      round: jecRound, rounds: jecRounds,
      roundScores: [...roundScores],
      scores:      [...jecScores],
      // Per-Chef breakdown so clients render the same Tally rather than a bare
      // total. Every field is a number — 0 survives the wire; only emptiness is
      // erased — but the array itself is rebuilt on receipt regardless.
      bonus: bonus.map(b => ({ signature: b.signature, crutch: b.crutch, name: b.name })),
      roundLog: jecRoundLog,
    }});
  }
  jecRenderTally(roundScores, bonus);
  showScreen('screen-jec-tally');
}
```

- [ ] **Step 2: Rewrite `jecRenderTally`**

Each Chef's card gains a bonus line naming the badges they earned. The line is omitted entirely when no bonus landed — an empty line under every non-scoring Chef is noise.

```js
function jecRenderTally(roundScores, bonus) {
  document.getElementById('jec-tally-round-label').textContent = `Course ${jecRound} of ${jecRounds}`;
  const best = Math.max(...roundScores);
  document.getElementById('jec-tally-feedback').textContent =
    best >= jecGoldenScore * 3 ? "Head Chef Status: Absolutely Cookin'! 🔥"
    : best >= jecGoldenScore * 2 ? 'Five-star effort right there! ⭐'
    : 'Maybe stick to toast next time. 🍞';

  const ranked = jecPlayerNames
    .map((name, i) => ({ name, rs: roundScores[i], total: jecScores[i], b: bonus[i] }))
    .sort((a, b2) => b2.rs - a.rs);

  const list = document.getElementById('jec-tally-list');
  list.innerHTML = '';
  ranked.forEach(({ name, rs, total, b }) => {
    const rsText   = rs > 0 ? `+${rs}` : `${rs}`;
    const rsColour = rs > 0 ? 'text-amber-600' : rs < 0 ? 'text-red-500' : 'text-stone-400';
    const marks = [];
    if (b.signature) marks.push(`Signature Dish 🌟 +${b.signature}`);
    if (b.crutch)    marks.push(`Called It! 📣 +${b.crutch}`);
    if (b.name)      marks.push(`On the Menu! ⭐ +${b.name}`);
    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between';
    card.innerHTML = `
      <div>
        <p class="font-semibold text-stone-800">${name}</p>
        <p class="text-xs text-stone-400 mt-0.5">Total: ${total} pts</p>
        ${marks.length ? `<p class="text-xs text-amber-600 font-semibold mt-0.5">${marks.join(' · ')}</p>` : ''}
      </div>
      <span class="text-xl font-bold ${rsColour}">${rsText} pts</span>`;
    list.appendChild(card);
  });

  jecSetAdvanceCta('btn-jec-tally-next', jecRound < jecRounds ? 'Next Course' : 'Final Wash-up');
}
```

**Note the CTA labels lose their emoji** — § Action Button Standard: an action button's text is read at a glance mid-round and an emoji competes with the words for the same half-second.

- [ ] **Step 3: Update `JEC_TALLY` and `JEC_WASHUP` handlers**

```js
    if (env.type === 'SYNC' && env.payload.action === 'JEC_TALLY') {
      const p = env.payload;
      jecRound    = p.round;
      jecRounds   = p.rounds;
      jecScores   = jecWireArr(p.scores,      jecPlayerCount, 0);
      jecRoundLog = jecWireList(p.roundLog);
      const roundScores = jecWireArr(p.roundScores, jecPlayerCount, 0);
      // An all-zero bonus array is the common case and is exactly what Firebase
      // erases: every field 0 means every object is {} means the array vanishes.
      const bonus = jecWireArr(p.bonus, jecPlayerCount, null)
        .map(b => ({ signature: (b && b.signature) || 0,
                     crutch:    (b && b.crutch)    || 0,
                     name:      (b && b.name)      || 0 }));
      jecRenderTally(roundScores, bonus);
      showScreen('screen-jec-tally');
    }
```

**That comment names a real trap:** a Chef with no bonuses has `{ signature: 0, crutch: 0, name: 0 }`; `fbWrite` keeps `0`, so the object survives — but a round where *nobody* earned a bonus is still three objects of three zeros each, which survives. The genuine risk is a **missing** entry, which the `|| 0` fallbacks cover. Assert it rather than reasoning about it.

`JEC_WASHUP` — rebuild both collections:

```js
    if (env.type === 'SYNC' && env.payload.action === 'JEC_WASHUP') {
      jecScores   = jecWireArr(env.payload.scores, jecPlayerCount, 0);
      jecRoundLog = jecWireList(env.payload.roundLog);
      jecShowWashup();
    }
```

- [ ] **Step 4: Update the Cook Book and the podium**

`jecRenderCookBook` — the log entry now carries `order2` and `instruction`. Render the Fusion pairing and the instruction beneath the course number:

```js
    const orderText = entry.order2 ? `${entry.order} + ${entry.order2}` : entry.order;
    // …
      <div class="flex items-center justify-between">
        <p class="text-xs font-semibold uppercase tracking-widest text-stone-400">Course ${i + 1}</p>
        <p class="text-sm font-bold text-amber-600 uppercase tracking-wide">${orderText}</p>
      </div>
      ${entry.instruction ? `<p class="text-xs text-stone-400 italic">${entry.instruction}</p>` : ''}
```

`jecShowWashup` — adopt the fixed-width medal slot (§ Gameover podium rank icons). JEC is being touched anyway, so it takes the shape:

```css
/* Fixed-width medal slot — a row with NO medal must still reserve the width, or
   its text starts further left than a medalled row's and the podium reads as
   misaligned. */
.jec-medal-slot { width: 1.4rem; text-align: center; flex-shrink: 0; }
```

```js
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
    // …<span class="jec-medal-slot text-2xl">${medal}</span>
```

**Fix the pre-existing bug while here:** the current code computes `isFirst = p.score === topScore` and then shows `medals[i]`, so a two-way tie for first renders 🥇 and 🥈 for equal scores. Rank by score, not by index — every Chef on `topScore` takes 🥇.

- [ ] **Step 5: Add loopback assertions**

```js
// ── The Tally ─────────────────────────────────────────────────────────────────
host.__seat({ players: 3, golden: 30, fusion: false });
client.__seat({ players: 3, golden: 30, fusion: false });
host.__runPrepAll([['cheese','a1','a2'],['cheese','b1','b2'],['cheese','c1','c2']],
                  ['','','cheese'], [0,0,0]);
deliver(host, client, host.__lastSent('JEC_SIFTING'));
host.__advanceCheck(); deliver(host, client, host.__lastSent('JEC_TASTING'));
host.__advanceTasting();
env = host.__lastSent('JEC_TALLY');
check('tally carries bonus',      Array.isArray(env.payload.bonus), true);
check('bonus length is N',        env.payload.bonus.length, 3);
check('crutch bonus in payload',  env.payload.bonus[2].crutch, 15);
deliver(host, client, env);
check('client scores match host', client.__state().scores, host.__state().scores);
check('client rendered a bonus line',
  /Called It/.test(client.__el('jec-tally-list').innerHTML), true);
check('no throw on JEC_TALLY',    client.__errors, []);

// An ALL-ZERO bonus array is the common case and the erasure worst case.
check('all-zero bonus rebuilds to length N',
  client.__applyTally({ round: 1, rounds: 3, roundScores: [0,0,0], scores: [0,0,0],
                        bonus: [], roundLog: [] }).length, 3);

// Two-way tie for first: both take gold, not gold and silver.
check('tie for first takes two golds',
  host.__podiumMedals([30, 30, 10]), ['🥇', '🥇', '🥉']);
```

- [ ] **Step 6: Verify**

```bash
node tools/verify-jec-loop.js && node tools/verify-jec-loopback.js
node -e "const s=require('fs').readFileSync('index.html','utf8'); const b=s.match(/â€|Ã©|ï¿½/g); console.log('mojibake hits:', b?b.length:0);"
```
Expected: exit 0 both; 0 mojibake.

- [ ] **Step 7: Commit**

```bash
git add index.html css/styles.css js/games/jec.js js/engine-multiplayer.js
git commit -m "feat(jec): Tally renders the bonus breakdown; JEC_TALLY carries it

jecCalcRoundScores returns { roundScores, bonus }, and JEC_TALLY carries the
per-Chef breakdown so clients render the same Tally rather than a bare total. The
bonus array is rebuilt on receipt with per-field fallbacks - a missing entry is
the real erasure risk, not a zero.

jecFinishRoundToTally is shared by the standard Tasting CTA and the Fusion
vote-result CTA so the two paths cannot score differently.

The Cook Book shows the Fusion pairing and the Instruction per course. The podium
adopts the fixed-width medal slot, and a two-way tie for first now takes two
golds - it previously rendered gold and silver for equal scores."
```

---

## Task 13: The How to Play rewrite, bug J2, and the remaining copy sweep

Closes **bug J2** (open since the June 2026 audit) and finishes the terminology pass across every screen not yet touched.

**Files:**
- Modify: `index.html` — `jec-how-to-overlay` (~2573–2615), `screen-jec-menu` (~2242), `jec-quit-overlay` (~2657), `jec-new-shift-overlay` (~2644), `jec-oversight-overlay` (~2442), the prep pass gate — **Node script**
- Modify: `js/games/jec.js` — the `jecShowHelpTip` call sites (~892–913)

**Interfaces:**
- Consumes: nothing new.
- Produces: the finished copy surface; `tools/verify-identity-docs.js` becomes meaningful for JEC once Task 14 mirrors these strings.

**Bug J2, both halves:**
1. The how-to states the Table for One penalty as **−10** when code and settings say **−5**.
2. It describes the Crowded Kitchen Tax as "−2 per *extra* Chef" when it is −2 per Chef **including you**.

(The `secret-mode.js` copy of the same bug was closed in Task 2; the settings-overlay copy in Task 7. This is the third and last site.)

- [ ] **Step 1: Rewrite the how-to overlay**

Five step cards → Winning and Scoring → ✨ Sylly Mode → close button. Canonical structure per § How-to Overlay Standard; step labels `text-amber-500`, step headings carry **no emoji**, close button `bg-amber-500 hover:bg-amber-600`.

Subtitle: `Think the same as just enough people — not too many, not too few.` (unchanged; it is a description, not the tagline).

```html
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-amber-500">Step 1</p>
          <p class="font-bold text-stone-800">Everyone sees the same Order.</p>
          <p class="text-stone-500 text-sm">A dish — like "Pizza" or "Nachos" — appears on screen. With <span class="font-semibold text-stone-700">Special Instructions</span> on, it comes with a twist: <span class="font-semibold text-stone-700">on a $5 budget</span>, or <span class="font-semibold text-stone-700">at 3am</span>.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-amber-500">Step 2</p>
          <p class="font-bold text-stone-800">Each Chef secretly picks 3 ingredients.</p>
          <p class="text-stone-500 text-sm">What would you put in this dish? You want to match others — without being so obvious that everybody does.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-amber-500">Step 3</p>
          <p class="font-bold text-stone-800">Back one with a star.</p>
          <p class="text-stone-500 text-sm">Tap the ⭐ to make one ingredient your <span class="font-semibold text-stone-700">Signature Dish</span>. If it lands in the golden range, it scores <span class="font-semibold text-stone-700">double</span>. If it doesn't, it just scores what it was worth — the only loss is the double you missed.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-amber-500">Step 4</p>
          <p class="font-bold text-stone-800">Call the Crutch.</p>
          <p class="text-stone-500 text-sm">Every kitchen has one. Name the culinary cliché you reckon everyone leans on — it can't be one of your own three. Get the round's most-picked ingredient, shared by <span class="font-semibold text-stone-700">3 or more Chefs</span>, and you've <span class="font-semibold text-stone-700">Called It! 📣</span> Miss and it costs you nothing.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-amber-500">Step 5</p>
          <p class="font-bold text-stone-800">Sous Chef's Check, then The Tasting.</p>
          <p class="text-stone-500 text-sm">First the table merges any ingredient that's the same word spelt two ways — <span class="font-semibold text-stone-700">before</span> anyone can see what it's worth. Then The Tasting reveals the counts, quietest first.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-amber-500">Winning and Scoring</p>
          <p class="font-bold text-stone-800">Most points after the last course wins.</p>
          <ul class="list-disc pl-5 flex flex-col gap-1 text-stone-500 text-sm">
            <li>🍽️ <span class="font-semibold text-stone-700">Table for One</span> — nobody else picked it. No points (with the penalty on: −5 pts).</li>
            <li>✨ <span class="font-semibold text-stone-700">Chef's Kiss</span> — exactly one other Chef picked it. The jackpot.</li>
            <li>👌 <span class="font-semibold text-stone-700">Crowd-Pleaser</span> — a few of you picked it. Half the jackpot.</li>
            <li>🍲 <span class="font-semibold text-stone-700">Too Many Cooks</span> — everybody picked it. A token (with the tax on: −2 pts per Chef who picked it, including you).</li>
            <li>🌟 <span class="font-semibold text-stone-700">Signature Dish</span> — a golden nomination scores double.</li>
            <li>📣 <span class="font-semibold text-stone-700">Called It!</span> — a correct Crutch pays half the jackpot.</li>
          </ul>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-amber-500">✨ Sylly Mode</p>
          <p class="font-bold text-stone-800">Fusion Cuisine</p>
          <p class="text-stone-500 text-sm">Two Orders drop at once — <span class="font-semibold text-stone-700">Sushi + Pizza</span>. Prep three ingredients for the mash-up and give the thing a name, all in one go. After The Tasting everyone votes on the best name; the winner goes <span class="font-semibold text-stone-700">On the Menu! ⭐</span> for half the jackpot. Ties all pay.</p>
        </div>
```

**The −5 and "including you" in the Winning and Scoring card are bug J2's fix.** Do not paraphrase them.

- [ ] **Step 2: Sweep the remaining copy**

| Where | Change |
|---|---|
| `jec-oversight-overlay` heading | "Sous Chef Oversight" → **"Sous Chef's Check"** |
| `jec-oversight-overlay` confirm | `Yep — merge 'em!` (keep; no emoji, brand amber, correct) |
| `jec-oversight-overlay` cancel | `min-h-11 … text-base font-medium` → **`min-h-14 … text-lg font-semibold`** per § Quit Overlay Checklist button sizing; a Decision Modal's two buttons match |
| `jec-quit-overlay` | Verify against the checklist: thematic emoji, game-voiced heading and subtext, themed confirm, neutral cancel, both `min-h-14 … text-lg font-semibold` |
| `jec-new-shift-overlay` | **Verify the z-index.** The spec flags it as z-[80]-should-be-z-[90]; it currently reads **z-[90]** at `index.html:2644`, so this is likely already correct — confirm and record as a no-op rather than "fixing" it twice |
| `screen-jec-menu` | Tagline `Won't Spoil the Broth!` and Play CTA `Let's Cook!` both kept; confirm the four buttons match § Universal Menu Standard sizing |
| Prep pass gate | `The broth is simmering…` kept |
| `jecShowHelpTip` call sites | Retarget the tips: the Signature tap, The Crutch, and (Fusion) Name the Dish. Delete any Poison Word tip. Max 3 bullets each, one sentence per bullet |
| Every `Round N of M` | → `Course N of M` (done in Task 8; re-grep to confirm none survive) |

Grep sweep for retired terms across the whole app:

```bash
grep -rn "Pongy\|Nice Match\|Pantry Cabinet\|Menu Complexity\|Sous Chef Oversight\|Rotten Penalty\|Spoilt Penalty\|Kitchen Nightmare\|Poison Word\|Health Inspector\|Today's Recipe\|dash of Sabotage\|servo\|barbie" index.html js/ docs/game-identities/jec.md
```
Expected after the sweep: no hits in `index.html` or `js/`. Hits in the identity doc are fixed in Task 14.

- [ ] **Step 3: Verify**

```bash
node -e "const s=require('fs').readFileSync('index.html','utf8'); const b=s.match(/â€|Ã©|ï¿½/g); console.log('mojibake hits:', b?b.length:0);"
node tools/verify-jec-loop.js && node tools/verify-jec-loopback.js
```
Expected: 0 mojibake; both harnesses exit 0.

`visual-check` the how-to overlay scrolled to the bottom — confirm the ✨ Sylly Mode card is last, above the close button, and that the Winning and Scoring list does not overflow at 360 px.

- [ ] **Step 4: Commit**

```bash
git add index.html js/games/jec.js
git commit -m "fix(jec): close bug J2 and finish the terminology pass

The how-to stated the Table for One penalty as -10 when code and settings both
say -5, and described the Crowded Kitchen Tax as -2 per EXTRA Chef when it is -2
per Chef including you. Open since the June 2026 audit; this is the third and
last site (secret-mode.js and the settings overlay were closed earlier in the
rework).

A Bit Pongy -> Table for One: slang, smell-based, and it called the ingredient
bad when the only thing wrong with it is that nobody joined you. Nice Match ->
Crowd-Pleaser, so the tiers escalate cleanly: alone, perfect pair, crowd-pleaser,
too many cooks. Today's Recipe -> What Went In, because 'recipe' read as the
dish, which is the Order. Slang dialled back: servo -> petrol station, barbie ->
barbecue. Australian spelling and metric units are untouched.

Five step cards now teach the Signature tap and The Crutch, and the Sylly Mode
card is Fusion Cuisine."
```

---

## Task 14: Documentation closure, SW bump, and the full sweep

The Documentation Integrity Protocol, in its mandated order. No task is complete until this one is.

**Files:**
- Modify: `docs/code-map.md`, `docs/game-identities/jec.md`, `CLAUDE.md`, `docs/implementation-notes/jec-implementation-notes.md`, `docs/decision-log.md`, `docs/deferred-work.md`, `sw.js`

- [ ] **Step 1: `docs/code-map.md`**

Grep the JEC section first (`grep -n "jec" docs/code-map.md | head -40`), then offset-Read that slice — **never read this file whole (~132 KB)**. Record:
- New screen `screen-jec-name-vote` and its two sub-states (`jec-name-vote-ballot`, `jec-name-vote-result`)
- `screen-jec-sifting`'s two sub-states (`jec-sifting-check`, `jec-sifting-tasting`)
- New element IDs from Tasks 8–12
- The packet table: `JEC_ORDER` (+`instruction`, +`word2`), `JEC_PREP_SUBMIT` (−`poison`, +`crutch`, +`signatureIdx`, +`fusionName`), `JEC_SIFTING` (−poison fields, +`jecCrutches`, +`jecFusionNames`), **`JEC_TASTING`** (new), **`JEC_NAME_VOTE_BEGIN`** (new — not in the spec's § 7.1 table; see Step 4), **`JEC_NAME_VOTE`** (new), **`JEC_NAME_RESULT`** (new), `JEC_TALLY` (+`bonus`), `JEC_MERGE` (−`jecPoisonedNorms`)
- The new state variables and the deleted ones
- `jecHandleEnvelope` now exists as a named function in `js/engine-multiplayer.js`

- [ ] **Step 2: `docs/game-identities/jec.md`**

Read it whole (15–25 KB — it is written to be read end to end). Respect each section's **free / paired / derived** tag; the change contract is `docs/superpowers/specs/2026-08-22-game-identity-docs-design.md` § 5.

- **T5 Terminology** (*paired*) — the full § 4.2 table: retire A Bit Pongy, Nice Match, The Pantry Cabinet, Dishes, Menu Complexity + its three pills, Sous Chef Oversight, Rotten Penalty, Spoilt Penalty, Today's Recipe, Kitchen Nightmare!, Health Inspector's Report, "Add a dash of Sabotage", Kitchen Nightmares. Add Special Instructions, The Crutch, Called It!, The Callouts, Fusion Cuisine, The Fusion, Name the Dish, On the Menu!.
- **T6 Settings** (*mixed*) — the nine-setting table from spec § 5, with defaults.
- **T7a The flow** (*derived*) — the eight-screen table from spec § 6; rows 3–7 loop per Course, row 6 is Fusion-only.
- **T7b The words on screen** (*paired*) — **every `copy` block must be updated to match the shipped `index.html` verbatim.** This is what `tools/verify-identity-docs.js` checks. Add a block for `screen-jec-name-vote`. Bounded matching means a truncated string fails — transcribe whole labels, not fragments.
- **T8** (*free*) — rewritten for Fusion Cuisine.
- **T10 At the Table** (*derived*) — record the two accepted lumps from spec § 2.6: **3 players is "binary and fast"** (no Crowd-Pleaser band — 2 Chefs is the jackpot, 3 is the token, nothing between), and the Crowd-Pleaser band is deliberately **flat** at 6.

- [ ] **Step 3: `CLAUDE.md`**

1. **Move the outgoing SW v210 entry verbatim** into `docs/sw-changelog.md`, at the top. A second `**SW v…**` paragraph left in § Current Focus means this did not happen.
2. Write the SW v211 entry (≤ 6 lines, one version only).
3. Bump `CACHE_NAME` in `sw.js` to `'sylly-games-v211'`. **No new files are precached** — this rework adds no assets, so `PRECACHE_URLS` is unchanged.
4. Add two rows to § Verification harnesses:

| Game | Command | Checks |
|------|---------|--------|
| JEC | `node tools/verify-jec-loop.js` — tiers, Signature Golden-only double, Crutch resolution + the never-in-pool invariant, instructions deck, Fusion vote | ~82 |
| JEC | `node tools/verify-jec-loopback.js` — host↔client over a Firebase-shaped wire with a real mock DOM; accepts `JEC_SRC=` | ~70 |

- [ ] **Step 4: `docs/implementation-notes/jec-implementation-notes.md`**

Entry shape is **What happened → Root cause → Lesson**.

- **Close J2** — move it from open to resolved, naming all three sites (how-to overlay, settings overlay, `secret-mode.js`). *Lesson:* a value stated in copy has as many sites as the app has surfaces; grep for the number, not the sentence.
- **New: the merge-integrity finding.** *What happened:* the Sous Chef merge ran on top of a scored board. *Root cause:* the merge decision was made with full knowledge of what it was worth, so a Chef could push a merge that raised their own count. *Lesson:* when a player-driven correction affects scoring, gate it behind a sub-state that hasn't revealed the score yet — blindness removes the incentive rather than policing it.
- **New: the Signature-double code/doc mismatch.** *What happened:* the code doubled any positive score including the Too Many Cooks token; the identity doc had always said Golden-only. *Root cause:* the three-way status string had no way to express "Golden range", so the implementation reached for `pts > 0` instead. *Lesson:* when a rule names a *range*, the code needs a predicate for that range — `jecIsGolden` — not a proxy that happens to agree today.
- **New: the Crutch-not-in-pool invariant.** *Root cause:* a prediction that counts becomes a submission, and a Chef could manufacture a Crowd-Pleaser for themselves. *Lesson:* `jecBuildFrequency` reads one source by construction and now says so; the harness asserts the count directly rather than trusting the comment.
- **New: `JEC_NAME_VOTE_BEGIN` was not in the spec's packet table.** *Root cause:* § 7.1 listed the client→host vote and the host→all result, but clients also need to be *told* to enter the ballot and must hold the same name list. *Lesson:* a new interactive screen needs three packets, not two — enter, submit, resolve. Fold this into the Stage 2 missing-handler audit.
- **Template Gaps: close Option B (Kitchen Chaos Roles)** as superseded by this design. **Option A (Secret Sous-Chef) remains parked** — do not close it.

Add a one-line pointer in `docs/implementation-notes/shared-implementation-notes.md` if (and only if) the `jecHandleEnvelope` extraction is judged a pattern other Phase-22 games should follow.

- [ ] **Step 5: `docs/decision-log.md`**

One entry, newest on top, ~4 lines, pointer not deep-doc:

```markdown
### 2026-08-27 — Just Enough Cooks reworked; Kitchen Nightmares retired
Standard play gains real decisions (Signature nomination, The Crutch, Special
Instructions, a staged reveal); Sylly Mode becomes Fusion Cuisine. The unifying
idea is **modify the prompt to flatten the head** — Menu Complexity attacked the
wrong axis. JEC gets its first two harnesses. Spec:
`docs/superpowers/specs/2026-08-27-jec-rework-design.md`. Plan:
`docs/superpowers/plans/2026-08-27-jec-rework.md`.
```

- [ ] **Step 6: `docs/deferred-work.md`**

- Add: **Special Instructions × Fusion Cuisine stacking — flagged for playtest.** Three constraints may be one too many; making them mutually exclusive is a small, well-patterned change (`ui-style.md` § Mutually-exclusive / superseded).
- Add: **JEC has no How-to gallery tab** and correctly should not — no render seam, no artwork (identity doc T9). Record so a future sweep does not re-open it.
- Close: the `jec-new-shift-overlay` z-index item, if Task 13 Step 2 confirmed it was already z-[90].

- [ ] **Step 7: The full sweep**

```bash
node tools/verify-jec-loop.js
node tools/verify-jec-loopback.js
node tools/verify-mp-configs.js
node tools/verify-identity-docs.js
node tools/verify-identity-docs.js --self-test
```
All five must exit 0. `verify-identity-docs` is the one most likely to fail here — every `copy` block must match `index.html` verbatim with bounded matching, so a dropped ellipsis or a changed apostrophe fails.

Then confirm nothing regressed elsewhere:

```bash
node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js
node tools/verify-cjar-loopback.js && node tools/verify-pko-loop.js && node tools/verify-flw-loopback.js
grep -n "CACHE_NAME" sw.js
grep -c "SW v2" CLAUDE.md    # exactly ONE **SW v…** paragraph in Current Focus
```

- [ ] **Step 8: The real multi-device session**

**No harness substitutes for this.** None of them carry clock skew, Firebase ordering, dropped packets, or any judgement about how the game feels. Run a 3-device Lobby session and a 4-player Pass-the-Phone session, covering:
- Standard mode with Special Instructions ON; standard with them OFF
- Fusion Cuisine, including the name vote in **both** modes
- A Specials Board reroll mid-Order (confirm every client follows)
- A Sous Chef merge during the Check (confirm every client's board updates and no counts were visible)
- Sous Chef Check **OFF** (confirm the sub-state is skipped whole)
- A client quitting mid-round (confirm the session dissolves for everyone — the Mid-Game Quit Contract)
- Both penalties ON, at 3 players and at 6

- [ ] **Step 9: Commit**

```bash
git add docs/ CLAUDE.md sw.js
git commit -m "docs(jec): documentation closure for the rework; SW v211

code-map gains screen-jec-name-vote, the two Sifting sub-states and all nine
packet changes. The identity doc's T5/T6/T7a/T7b/T8/T10 are rewritten and every
copy block re-transcribed against the shipped index.html. Impl-notes close J2 and
record the merge-integrity finding, the Signature-double code/doc mismatch, the
Crutch-not-in-pool invariant, and the missing third packet on a new interactive
screen. Template Gaps close Option B as superseded; Option A stays parked.

Deferred: the Special Instructions x Fusion stacking question is flagged for
playtest rather than pre-emptively made exclusive."
```

---

## Self-Review

**Spec coverage.** Every section of the spec maps to a task:

| Spec § | Task |
|---|---|
| 2.1 Signature Dish promoted | 2 (scoring), 9 (the tap) |
| 2.2 The Crutch | 3 (resolution), 9 (the field), 10 (The Callouts) |
| 2.3 Special Instructions | 4 (deck), 7 (setting), 8 (render) |
| 2.4 Merge before the reveal | 10 |
| 2.5 The Tasting is a reveal | 10 |
| 2.6 Scoring unchanged + two lumps | 1 (tiers), 2 (penalties), 14 (T10 documents both lumps) |
| 3 Fusion Cuisine | 5 (logic), 9 (name field), 11 (vote) |
| 3.4 Stacking with Instructions | 7 (no exclusivity), 14 (playtest flag) |
| 4 Terminology + 4.4 bug J2 | 2 (secret-mode), 7 (settings), 13 (how-to) |
| 5 Settings table | 7 |
| 6 Screen flow + `allScreens[]` | 8, 9, 10, 11 (registration), 12 |
| 7.1 Packets | 6, 10, 11, 12 |
| 7.2 Rules that bite | 6 (erasure), 9 + 11 (host-direct), 11 (per-mode gate), 10 + 11 + 12 (host-gated CTAs), 14 (`verify-mp-configs`) |
| 7.3 Bounds | Untouched by design; asserted in 7 and 14 |
| 8 Verification | 1, 6, and every task's verify step |
| 9 Implementation constraints | Global Constraints; the Node-script + mojibake check recurs in 7, 8, 9, 10, 11, 12, 13 |
| 10 Documentation closure | 14 |
| 11 Out of scope | No task touches any of it |

**Three deviations from the spec, each deliberate and flagged in-place:**
1. **`JEC_NAME_VOTE_BEGIN`** is a seventh packet not in § 7.1's table. A new interactive screen needs three packets — enter, submit, resolve — and § 7.1 lists only the last two. Recorded in Task 14 Step 4 as a Template Gap.
2. **`jecHandleEnvelope` is extracted** from the inline block in `js/engine-multiplayer.js`. The spec says the handlers live inline; leaving them inline makes them unreachable from the loopback harness the spec itself mandates. The function stays in `engine-multiplayer.js`, so the Phase-22 file layout is preserved.
3. **`jec-new-shift-overlay`'s z-index** is flagged by the spec as z-[80]-should-be-z-[90], but `index.html:2644` already reads `z-[90]`. Task 13 verifies rather than "fixes", and Task 14 closes the item.

**Two pre-existing bugs found while reading and folded in**, both outside the spec's scope but inside files this rework rewrites anyway:
- `jec-help-tip-overlay` is **not** in `resetToLobby()` teardown (zero occurrences in `js/engine.js`) — added in Task 2.
- The washup podium renders 🥇/🥈 for a two-way tie at the top, because it ranks by index while colouring by score — fixed in Task 12.

**Type consistency, checked across tasks:** `jecBadge(count, N) → {key, label, cls}` (Tasks 2, 10); `jecIsGolden(key)` (2); `jecResolveNorm(raw)` (2, 3); `jecCalcRoundScores() → {roundScores, bonus}` (2, 3, 5, 12); `jecBonusValue()` (2, 3, 5, 11); `jecTallyNameVotes() → {votes, winners, bonus}` (5, 11); `jecWireArr(v, n, fill)` / `jecWireList(v)` / `jecWireObj(v)` (6, 10, 11, 12); `jecHostResolveSifting()` (6, 9); `jecFinishRoundToTally()` (11, 12); `jecSyncSettingsUI()` (7); `jecRenderOrder()` (8); `jecRenderTally(roundScores, bonus)` — two arguments everywhere (12).
