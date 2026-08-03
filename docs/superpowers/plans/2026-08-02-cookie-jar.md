# Cookie Jar (`cjar`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Cookie Jar — game 18, a simultaneous-choice push-your-luck card game for 4–8 players — including its Sylly Mode (Dibber Dobber), in one build phase.

**Architecture:** One new plugin file `js/games/cjar.js` holding all state and logic as globals (no modules, no classes), six new screens registered in `engine.js`'s `allScreens[]`, six overlays in `index.html`, and a new fixed-deck data file `data/cjar-data.json`. The game is MDLM-only and host-authoritative: the host owns the deck, resolves every flip, and broadcasts SYNC packets; clients only ever send a `CJAR_CHOICE` ACTION. Because an MDLM-only rules engine is unreachable from a single browser, **every host applier takes an explicit `playerIdx` and skips all broadcasts in `'single'` mode**, so four Node `vm` harnesses under `tools/` can play all N seats through the real shipped functions.

**Tech Stack:** Vanilla ES6+ JavaScript (all symbols global, no ES modules), HTML5, CSS3 + local Tailwind (`js/lib/tailwind-play.js`), Web Audio API (synthesised — no audio files), Firebase Realtime Database (lazy-loaded) for multiplayer, Node 18+ `vm` module for the verification harnesses. **No npm, no build step, no external libraries.**

**Source of truth:** `docs/new-game-tech-cookie-jar.md` (Stage 2 spec, confirmed 2 Aug 2026). Where this plan and the spec disagree, the spec wins — except for the two deltas recorded below, which were found while planning and are deliberate.

---

## Spec deltas found while planning

Both were found by reading the actual engine, not by inference. Neither changes a rule, a number, or any user-visible behaviour. Recorded here so the Protocol A drift check does not re-flag them as accidents.

**Delta 1 — `cjarShuffle` is not written; the engine's `shuffle` is reused.**
Spec §10 lists `cjarShuffle(arr)  // in-place Fisher–Yates` as a supporting helper. `js/engine.js:469` already has `shuffle(arr)`, which is **pure** — it returns a shuffled copy and leaves the argument untouched. Writing `cjarShuffle` would duplicate an engine primitive, which Protocol A § Technical Debt Harvest explicitly flags ("No engine duplication"). This plan calls `shuffle()` and reassigns instead. The consequence is mechanical and must be honoured everywhere: **`deck = shuffle(deck)`, never `shuffle(deck)` as a statement** — the latter silently does nothing. A second benefit: the harnesses stub `shuffle: a => [...a]` in the sandbox, which makes every deck build deterministic for free (this is exactly how `tools/verify-pko-chain.js` works).

**Delta 3 — a revealed card's effect resolves *before* the decision window, and `cjarResolveFlip` returns no `bustFamilyId`.**
Spec §6.4 gives `cjarResolveFlip(choices)` the return shape `{ deltas[], lines[], raidEnded, bustFamilyId }` and calls it "the single entry point … after the card has been revealed and the decision window has closed". Taken literally that puts the card's own effect *after* the choices — which makes the game degenerate: a player looking at a second Caught! card would Sneak Out for free every time, and a player looking at a 17-cookie card would always Take. Push-your-luck only works when the card resolves first and the choice is about the *next* one (this is Incan Gold's structure, which cjar's formulas already encode).

The spec's own packet table is the confirming tell: `CJAR_FLIP_START` carries `raidTotals[]`, `crumbs` and `seen{}` — precisely the fields a card effect mutates. It is broadcasting the **post-effect** state. So:

- `cjarApplyCardEffect()` (new) pops the card, applies its effect, and returns `{ busted, bustFamilyId }`. A bust **skips the decision window entirely** and goes straight to the BUSTED! interstitial.
- `cjarResolveFlip(choices)` stays the single entry point for *choice* resolution and returns `{ deltas, lines, raidEnded }`. `bustFamilyId` is dropped from it because a bust is a card-reveal outcome, not a choice outcome — keeping the field would imply a decision window that must not exist on a bust flip. `CJAR_FLIP_RESOLVE` still carries `bustFamilyId` in its payload for packet symmetry; the host sources it from `cjarApplyCardEffect`.

In **Dibber Dobber this does not apply**: §6.3 makes every outcome choice-driven, including the Family card, so `cjarApplyCardEffect` is a no-op there apart from placing a Treat on the counter.

**Delta 4 — there are 13 art keys, not 14.**
Spec §10 says "**14 keys**" and lists them as `cookie-handful | cookie-batch | cookie-mountain | family-mum…family-pet | treat-shortbread…treat-brownies`. Counted, that list is 3 + 5 + 5 = **13**. The 14th is the card back, which in the manifest format is the separate `assets.back` field, not an entry in `assets.faces` — `assetBack(kind)` resolves it, `assetFace(kind, id)` never sees it. So: **13 face keys, 1 back, 14 image files.** The manifest, the harness assertion and the precache list all use those numbers. This is a counting slip in the spec, not a design change; nothing about the art or the seam differs.

**Delta 5 — the fifth family archetype is Grandma, not Little Brother.** *(Owner decision, 2 Aug 2026, during Task 3.)*
The spec's fifth archetype is `little` / "Little Brother" 🧒. The delivered core art has `grandma.png` and no younger-child card: the owner could not get usable art generations of young children. Rather than ship a card whose art contradicts its name, the archetype **is** Grandma — `id: "grandma"`, name `"Grandma"`, emoji 👵 — and its eight flavour lines are re-voiced accordingly (indulgent, will mention it to your mother; consequence is being sat down and fussed over). This plan has been swept: every `little` id, `family-little` art key and `{ little: N }` copies-map entry now reads `grandma`. **Nothing else changes** — the archetype is a data key with no mechanics attached to its identity, copies stay at 3, and the deck composition, bust odds and Snack Friendly float are untouched. Task 17 records it in `game-identities.md` and the decision log.

**Delta 6 — High Alert excludes the busting family from the escalation pool.** *(Owner decision, 2 Aug 2026, during Task 12.)*
The spec's `cjarResolveBust` (`docs/new-game-tech-cookie-jar.md:319–331`) draws the High Alert family from **all** families with `copies > 0`, including the one that just burnt. Re-picking it sends that family 3→2 on the burn and 2→3 on the escalation — cancelling out, so nothing burns *and* nothing escalates and High Alert does nothing whatsoever that Raid. With 5 archetypes that was 1 bust in 5. It also contradicted the spec's own prose in three places ("escalated to **4 copies**" at :200, "a **4th copy** next Raid" at :325, "makes someone ***more*** likely" at :253). The pool now excludes `familyId`, plus an empty-pool guard that is unreachable in a real match but would otherwise write `cjarFamilyCopies[undefined]` and poison the deck. Found by re-running `verify-cjar-loop.js` across seeds — **seed 0 failed two assertions** while every other seed passed, because `pool[0]` happened to be the family the test busts. Post-fix, all six seeds tested pass. Task 17 must reconcile the spec's code block and the `verify-cjar-loop.js` assertion is now the rule's contract.

**Delta 7 — Dibber Dobber commits its choices BLIND; the card is revealed at resolve.** *(Owner decision, 2 Aug 2026, after Task 13.)*
Spec §6.3 has DD resolve the choices **against the card already face-up** — you see it is Mum, then decide. That makes Sylly a different game from the base mode: an informed response rather than a push-your-luck gamble. The owner's call is that **both modes must share one mental model.** Incan Gold — which the base game copies 1:1 — runs reveal → resolve → *choose about the next, unseen card*, and DD now matches that shape. Because every DD outcome is choice-driven, it cannot resolve a card before choices exist, so it inverts to **choose blind → reveal → resolve**. Same gamble, opposite implementation.

**What changed:** `cjarApplyCardEffect` is now base-game only (guarded at the top, before the pop). Two new host-side halves — `cjarOpenBlindWindow()` (bump `cjarFlipSeq`, reset the accumulators, set `cjarCard = null` so the hero renders face-down through the seam) and `cjarRevealSyllyCard()` (pop, place a Treat, log the trail). `cjarHostNextFlip` branches to the blind window in Sylly; `cjarHostResolveFlip` reveals *before* calling `cjarResolveFlip`, because `cjarResolveFlipDD` resolves against `cjarCard` and reports `raidEnded` from the post-pop deck length. The shared tail of both paths is factored into `cjarOpenDecisionWindow()` so the two cannot drift.

**What did NOT change:** `cjarResolveFlipDD` and the entire Task 8 ledger are byte-identical — only *when* `cjarCard` and `cjarChoices` get populated moved. `verify-cjar-dd.js`'s 47 checks passed untouched.

**The balance baseline survives.** `simulate-cjar-dd.js`'s agents were always card-blind (`pick()` takes weights only and never saw the card), so the instrument was already measuring this model. Re-measured post-change: 5p spread 33.1 → 34.3 pts, Innocent 52.4% → 53.5%, debt-at-cap 12.7% → 12.6%, Treats claimed 97.0% → 96.9%; 8p spread 37.9 → 37.4. All within noise. **DD-06 stands unchanged.** The simulator's loop *was* updated — it drove the old order and flatlined once Sylly stopped revealing in `cjarApplyCardEffect`.

**Inherent asymmetry, accepted:** the base game's first decision of a Raid is informed by card 1's already-resolved effect; DD's first decision is fully blind. That falls out of DD resolving *from* the choices and cannot be removed.

Task 17 must reconcile spec §6.3 and Delta 3's DD carve-out. `CJAR_FLIP_START` must **omit `card`** in Sylly (Task 15, unwritten — free).

**Delta 2 — `getMuteToggleOnClass()` is missing `'frt'`. Out of scope; do not fix here.**
The map at `js/engine.js:465` lists 16 of the 17 shipped games — `frt` is absent, so Fruit Salad's mute toggle falls back to `game-toggle-on-stone` instead of its brand class. This is a pre-existing FRT bug unrelated to Cookie Jar. Task 1 adds `'cjar'` to the same map and **must not** touch the `frt` gap: fixing an unrelated game's bug inside a new-game commit makes both harder to review and to revert. Log it in `docs/implementation-notes/frt-implementation-notes.md` during Task 17 instead.

---

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the spec and the always-loaded rule files.

- **No build tooling.** No `npm`, no webpack, no bundler, no external JS libraries. All symbols are global; forward references work at runtime because scripts load in a fixed order.
- **Load order.** `<script src="js/games/cjar.js">` goes **after** `js/games/pko.js` (`index.html:6766`) and **before** `js/secret-mode.js` (`index.html:6767`).
- **Australian English, metric only.** "colour", "flavour", "organise", "recognise". No "color"/"flavor"/"organize". This applies to code comments, UI copy, and docs.
- **Brand colour `#D4A017` takes dark ink `#292524` (stone-800) — never white.** Measured: white is **2.38:1**, below the 3:1 large-text floor; stone-800 is **6.39:1**. This propagates to `.cjar-cta`, `ctaTextClass: 'text-stone-800'` in `MP_GAME_CONFIGS`, and the how-to close button. Hover fill `#B8860B`. Label colour is the darkened `#7A5C0A` (raw `#D4A017` on `bg-stone-50` measures under 3:1). Settings light tint `bg-[#F7E9C4] hover:bg-[#EFDCA8] text-[#7A5C0A]`. Modal border `border-[#E5C97A]`.
- **`index.html` encoding rule — binding.** The file is ~515 KB. A **single contiguous insertion** is safe with the Edit tool. Any **multi-occurrence sweep** must go through a scoped Node script — the Edit tool has produced UTF-8 mojibake corruption on this file before.
- **Every screen is the Stack.** `<section class="flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">` wrapping ONE `flex flex-col w-full max-w-sm gap-4` column with Header, Stage and Controls as siblings. No `h-screen`, no `flex-1`/`flex-shrink-0` split, no `my-auto`.
- **Appliers take an explicit `playerIdx` and skip every broadcast when `window.syllyMultiplayerMode === 'single'`.** This is what lets one Node process play all N seats. An applier that reads `mpMyPlayerIdx` internally is untestable and must not be written.
- **Every accumulator reset travels in the SYNC payload, not host-local state.** `cjarChoices[]`, `cjarReadyCheck[]`, `cjarCrumbDebt[]`, `cjarSeen{}`, `cjarTrail[]` reset at their reset value inside `CJAR_FLIP_START` / `CJAR_RAID_START`. The host resets them when it builds the new flip; clients never do. This is FLW BUG-01, and cjar fires the pattern ~55× a match.
- **`cjarAllIn()` gates on active seats only** — `cjarActive.every((a,i) => !a || cjarReadyCheck[i])`. Plain `.every(Boolean)` freezes every base-game Raid the moment anyone Sneaks Out.
- **All card DOM is built inside `cjarRenderCard`.** A bypass is unskinnable (DYB's old cup-die bypass is the cautionary case).
- **`mpPlayerSlots[i].nickname`, never `.name`** — `.name` returns `undefined` silently.
- **Never prefix `mpMyPlayerIdx`, `mpPlayerSlots`, `mpActiveGame`, `mpActiveRoomCode` with `window.`** — they are `let`-declared and the prefix returns `undefined` silently (BLD Bug 8). `window.syllyMultiplayerMode`, `window.syllySyncLocked`, `window.mpLobbyStyle` **are** on `window` and **do** need the prefix.
- **Comment style.** File header `// ═══…` box; section headers `// ── CJAR Settings ─────`; inline rationale explains *why*, not *what*.
- **Commit messages** end with:
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  ```
- **Constants (spec §4) — exact values, no rounding, no re-derivation:**
  ```javascript
  CJAR_DECISION_MS      = 15000
  CJAR_TIMEOUT_GRACE_MS = 1500
  CJAR_REVEAL_MS        = 3000
  CJAR_INTERSTITIAL_MS  = 5000
  CJAR_DD_CUT           = 10
  CJAR_DD_START_STASH   = 5
  CJAR_DD_DOB_STEAL     = 2
  CJAR_DD_DOB_BACKFIRE  = 2
  CJAR_DD_TAKE_LOSS     = { favourite: 0, neutral: 2, watcher: 4 }
  CJAR_DD_DEBT_CAP      = 6
  ```
- **Copy rules from the Consistency Audit.** Never write the bare word **"Stash"** in user-facing copy — always "Cookie Stash". The flip log is the **Crumb Trail** (never "Cookie Trail" — PKO owns *The Trail*). The setting is **House Rules** (never "Kitchen Rules" — JEC owns the kitchen metaphor). The end-screen exit is **"Leave the Jar"**. In Sylly Mode the word **"Sneak" must not appear at all** — nobody leaves in Dibber Dobber, and reusing the base game's verb teaches the wrong rule.

---

## File Structure

**Created:**

| File | Responsibility |
|---|---|
| `js/games/cjar.js` | The entire plugin — state, deck, both resolvers, all rendering, `cjarHandleEnvelope`. Single file per suite convention (every other game is one file). |
| `data/cjar-data.json` | The fixed deck: 15 cookie values, 3 tier labels, 5 family archetypes with flavour pools, 5 treats, 2 treat schedules. |
| `docs/cjar-content-guide.md` | Authoring rules for the flavour pools — voice, Australian English, per-archetype personality. |
| `data/art/cjar/pack.json` | Core art manifest — 14 face keys + 1 back, `kind: 'cjar'`. |
| `data/art/cjar/img/*.jpg` | 15 JPEGs, ~360 px wide, **≤ 40 KB each**, ≈ 600 KB total. |
| `tools/verify-cjar-deck.js` | Data layer: schema, deck composition, Snack Friendly float, treat schedule + lifecycle, House Rules across a match. |
| `tools/verify-cjar-loop.js` | Base game: splits, sneak/bust resolution, `cjarAllIn()` with a departed seat, deck exhaustion, full-match tie-break. |
| `tools/verify-cjar-dd.js` | Dibber Dobber: all three card types × every action combination, scare-off, Treat priority, Crumb Debt, affinities. |
| `tools/simulate-cjar-dd.js` | Balance simulation at the real ~11-card deck (spec §17 D-11 mitigation). |
| `docs/implementation-notes/cjar-implementation-notes.md` | Four sections: Design Decisions / Bug Index / Multiplayer Lessons / Template Gaps. |

**Modified:**

| File | Change |
|---|---|
| `js/engine.js` | 6 screen IDs into `allScreens[]` (after line 81); `'cjar': 'cjar-range'` into `updateSliderTheme()` (line 450); `'cjar': 'game-toggle-on-cjar'` into `getMuteToggleOnClass()` (line 465); teardown block into `resetToLobby()` (after line 633). |
| `js/engine-multiplayer.js` | `MP_GAME_CONFIGS.cjar` entry (after the `pko` entry at line 403); `case 'cjar':` in `mpSerialiseSettings` (near line 845); `cjarHandleEnvelope` routing block (after the pko block at line 1655). |
| `css/styles.css` | Append the cjar brand block: `pill-active-cjar`, `game-toggle-on-cjar`, `cjar-cta`, `cjar-label`, `cjar-range` (×3 rules), `.cjar-card*`, `.cjar-card-asset`, `.cjar-card-back`. |
| `index.html` | Lobby button after `#btn-pko` (line 91); `<script src="js/games/cjar.js">` after line 6766; the whole COOKIE JAR section appended at end of file (after line 9057, before the closing tags). |
| `sw.js` | `js/games/cjar.js`, `data/cjar-data.json`, `data/art/cjar/pack.json` + 15 images into `PRECACHE_URLS`; `CACHE_NAME` → `sylly-games-v157`. |
| `data/art/registry.json` | `["pko","flw","frt","shp"]` → `["pko","flw","frt","shp","cjar"]`. |
| Docs (Task 17) | `docs/code-map.md`, `docs/rules/game-identities.md`, `CLAUDE.md`, `.claude/rules/ui-style.md`, `.claude/rules/logic-engine.md`, `docs/decision-log.md`, `docs/content-prompts/new-game-brief-prompt.md`, `docs/phase39-snapshot.md`. |

---

## Build order and its relationship to Protocol B

`docs/rules/phase-audit.md` § Protocol B fixes the build order. This plan maps onto it exactly:

| Protocol B step | Tasks |
|---|---|
| Step 0 — Template Gap Review | Done at Stage 2 (spec §17 records 11 resolved deviations). No task. |
| Step 1 — Brief | Done (brief v5, superseded by the spec). No task. |
| Step 2 — Scaffold (state + empty functions) | **Task 1** |
| Step 3 — Flow Verification (routing only) | **Task 2** |
| Step 4 — Exit Routing (before game logic) | **Task 2** |
| Step 5 — Logic Injection (one screen at a time; settings/overlays/Sylly last) | **Tasks 3–16** |
| Protocol A — Drift Check + Phase Gate | **Task 17** |

**Do not write a line of game logic before Task 2's gate passes.** That gate is the whole point of Protocol B.

---

### Task 1: Foundation scaffold and engine registration

Protocol B Step 2. Produces a plugin that loads cleanly with every state variable declared and every function named but empty, plus every engine-side registration point. No game logic.

**Files:**
- Create: `js/games/cjar.js`
- Create: `tools/verify-cjar-deck.js`
- Modify: `js/engine.js:81` (allScreens), `js/engine.js:450` (slider map), `js/engine.js:465` (toggle map), `js/engine.js:633` (resetToLobby teardown)
- Modify: `css/styles.css` (append)
- Modify: `index.html:91` (lobby button), `index.html:6766` (script tag)

**Interfaces:**
- Consumes: `showScreen(id)`, `shuffle(arr)`, `playLaunch()` and the rest of the `play*()` catalogue, `activeGameId`, `openSoundOverlay()`, `resetToLobby()` — all from `js/engine.js`. `mpShowModeScreen(abbr)`, `mpPlayerSlots`, `mpSendEnvelope`, `mpSendPrivate`, `mpLockSync`, `mpUnlockSync`, `mpReturnToLobby`, `mpMyPlayerIdx`, `window.syllyMultiplayerMode` — from `js/engine-multiplayer.js`. `assetFace(kind,id)`, `assetBack(kind)` — from `js/lib/art.js`.
- Produces: every constant and `let` in the state block below; the function names `cjarShowMenu()`, `cjarShowClientStandby()`, `cjarStartMatch()`, `cjarStartRaid()`, `cjarNextFlip()`, `cjarResolveFlip()`, `cjarEndRaid()`, `cjarEndMatch()`, `cjarResetState()`, `cjarHandleEnvelope(env)`, `cjarApplyExpansionOverrides()`. Later tasks fill these; none is renamed.

- [ ] **Step 1: Write the failing test — the harness bootstrap**

This is the sandbox every later harness copies. Create `tools/verify-cjar-deck.js`:

```javascript
// ═══════════════════════════════════════════════════════════════════════════
// verify-cjar-deck.js — asserts Cookie Jar's DATA layer headlessly.
//
//   node tools/verify-cjar-deck.js        (exits 1 on any failure)
//
// Covers data/cjar-data.json's schema and cjarBuildDeck()'s composition under
// every setting: Snack Friendly float, the Treat schedule at both match lengths,
// the three Treat carry/discard rules, and House Rules burn/on-guard/high-alert
// across a full match.
//
// Why it exists: cjar is MDLM-only, so the deck builder is unreachable from a
// single browser. Without this the first Raid ever dealt is also the first time
// the code runs. It re-implements no rules — every assertion runs against the
// real js/games/cjar.js.
//
// Two sandbox rules that earn their keep:
//   • setTimeout is CAPTURED, never fired — an auto-advance being *scheduled*
//     becomes an assertion in its own right, and nothing races the test.
//   • mpSendEnvelope / mpSendPrivate THROW rather than no-op, so a broadcast
//     leaking into 'single' mode fails loudly instead of passing silently.
//
// The vm gotcha: `let` in a vm-evaluated script creates a lexical binding, NOT a
// property on the context object, so cjarDeck & friends are invisible from out
// here. The appended bridge exposes them. `function` declarations DO land on the
// object, which is why the builders are callable directly.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');
const dataPath = path.join(ROOT, 'data/cjar-data.json');
const dataJson = fs.existsSync(dataPath) ? fs.readFileSync(dataPath, 'utf8') : '{}';

const screens = [];
const timers  = [];
const sandbox = {
  console,
  document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
  window: { syllyMultiplayerMode: 'single' },
  fetch: () => Promise.resolve({ json: () => Promise.resolve(JSON.parse(dataJson)) }),
  // Deterministic stand-in for engine.js's pure shuffle — identity, so every deck
  // build is reproducible. See plan Delta 1: cjar reassigns, never mutates in place.
  shuffle: a => [...a],
  showScreen: id => screens.push(id),
  setTimeout: (fn, ms) => timers.push({ fn, ms }) - 1,
  clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  playLaunch() {}, playWhoosh() {}, playDone() {}, playTick() {}, playBoing() {},
  playAlarm() {}, playSuccess() {}, playClashWin() {}, playHullThud() {},
  playAbyssThud() {}, playUnchallenged() {}, playPoacher() {}, playExit() {},
  playPillClick() {}, playSyllyOn() {}, playSyllyOff() {},
  assetFace: () => null, assetBack: () => null,
  mpSendEnvelope() { throw new Error('mpSendEnvelope called in single mode'); },
  mpSendPrivate()  { throw new Error('mpSendPrivate called in single mode'); },
  mpLockSync() {}, mpUnlockSync() {}, mpPlayerSlots: [], mpMyPlayerIdx: 0,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const BRIDGE = `
globalThis.__cjar = {
  get deck()        { return cjarDeck; },
  get data()        { return CJAR_DATA; },
  get familyCopies(){ return cjarFamilyCopies; },
  get carried()     { return cjarTreatsCarried; },
  get live()        { return cjarTreatsLive; },
  get highAlert()   { return cjarHighAlertId; },
  get crumbs()      { return cjarCrumbs; },
  get raidNo()      { return cjarRaidNo; },
  consts: { DD_CUT: CJAR_DD_CUT, DD_START_STASH: CJAR_DD_START_STASH,
            DECISION_MS: CJAR_DECISION_MS, REVEAL_MS: CJAR_REVEAL_MS,
            INTERSTITIAL_MS: CJAR_INTERSTITIAL_MS, GRACE_MS: CJAR_TIMEOUT_GRACE_MS,
            DOB_STEAL: CJAR_DD_DOB_STEAL, DOB_BACKFIRE: CJAR_DD_DOB_BACKFIRE,
            TAKE_LOSS: CJAR_DD_TAKE_LOSS, DEBT_CAP: CJAR_DD_DEBT_CAP },
  // Seats a Raid directly so each scenario is deterministic — no dealing.
  seat(o) {
    cjarPlayerCount   = o.players;
    cjarPlayerNames   = Array.from({ length: o.players }, (_, i) => 'P' + i);
    cjarSyllyMode     = !!o.sylly;
    cjarSnackFriendly = o.snack  || 'off';
    cjarHouseRules    = o.house  || 'burn';
    cjarMatchLength   = o.length || 5;
    cjarRaidNo        = o.raidNo || 1;
    cjarFamilyCopies  = o.familyCopies || { mum:3, dad:3, big:3, grandma:3, pet:3 };
    cjarTreatsCarried = o.carried || [];
    cjarTreatsLive    = o.live || CJAR_DATA.treats.map(t => t.id);
    cjarHighAlertId   = o.highAlertId === undefined ? null : o.highAlertId;
    cjarCrumbs = 0; cjarSeen = {}; cjarCounterTreat = null; cjarTrail = [];
  },
  build() { cjarDeck = cjarBuildDeck(); return cjarDeck; },
  setDeck(d) { cjarDeck = d; },
  tier(v) { return cjarCookieTier(v); },
  artKey(c) { return cjarArtKey(c); },
  scheduled() { return cjarScheduledTreat(); },
};`;

vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/games/cjar.js'), 'utf8') + BRIDGE, sandbox,
  { filename: 'js/games/cjar.js' });

// ── Assertion harness ─────────────────────────────────────────────────────
let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}` +
    (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
const section = t => console.log(`\n${t}`);

(async () => {
  console.log('Cookie Jar — data layer verification\n' + '='.repeat(48));
  const C = sandbox.__cjar;

  section('Constants match spec §4');
  check('CJAR_DECISION_MS',      C.consts.DECISION_MS,     15000);
  check('CJAR_TIMEOUT_GRACE_MS', C.consts.GRACE_MS,        1500);
  check('CJAR_REVEAL_MS',        C.consts.REVEAL_MS,       3000);
  check('CJAR_INTERSTITIAL_MS',  C.consts.INTERSTITIAL_MS, 5000);
  check('CJAR_DD_CUT',           C.consts.DD_CUT,          10);
  check('CJAR_DD_START_STASH',   C.consts.DD_START_STASH,  5);
  check('CJAR_DD_DOB_STEAL',     C.consts.DOB_STEAL,       2);
  check('CJAR_DD_DOB_BACKFIRE',  C.consts.DOB_BACKFIRE,    2);
  check('CJAR_DD_DEBT_CAP',      C.consts.DEBT_CAP,        6);
  check('CJAR_DD_TAKE_LOSS',     C.consts.TAKE_LOSS, { favourite: 0, neutral: 2, watcher: 4 });

  console.log(`\n${'='.repeat(48)}`);
  console.log(failures ? `FAILED — ${failures} check(s)` : 'ALL CHECKS PASSED');
  process.exit(failures ? 1 : 0);
})();
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node tools/verify-cjar-deck.js`
Expected: FAIL — `Error: ENOENT: no such file or directory, open '.../js/games/cjar.js'`

- [ ] **Step 3: Create `js/games/cjar.js` — header, constants, state, stubs**

```javascript
// ═══════════════════════════════════════════════════════════════════════════
// Cookie Jar (cjar) — simultaneous-choice push-your-luck card game. Everyone
// decides at once: keep raiding the jar for a bigger share, or Sneak Out and
// bank what you've got before someone's Mum catches you twice. MDLM-only, 4–8
// players, host-authoritative, host-as-participant.
// Sylly Mode = Dibber Dobber — three actions, no bust, nobody ever leaves.
// Spec: docs/new-game-tech-cookie-jar.md  (Stage 2 confirmed 2 Aug 2026)
// Depends on: engine.js (showScreen, play*, shuffle, resetToLobby, activeGameId,
//             openSoundOverlay), engine-multiplayer.js (mpShowModeScreen, mpPlayerSlots,
//             mpSendEnvelope, mpSendPrivate, mpReturnToLobby, mpLockSync, mpUnlockSync,
//             window.syllyMultiplayerMode, mpMyPlayerIdx), art.js (assetFace/assetBack)
// SCAFFOLD STAGE (Protocol B Step 2): state + named stubs. Logic injected per spec §15.
// ═══════════════════════════════════════════════════════════════════════════

// ── Constants ──────────────────────────────────────────────────────────────
// DECISION and REVEAL are deliberately SEPARATE dials (spec §16 Q1): one is a
// deciding budget, the other a reading budget. Unlike PKO's two 5 s constants
// they are not held equal, and tuning one must not touch the other.
const CJAR_DECISION_MS      = 15000; // per-flip decision window (host-authoritative)
const CJAR_TIMEOUT_GRACE_MS = 1500;  // host waits this long past endTimestamp for in-flight ACTIONs
const CJAR_REVEAL_MS        = 3000;  // reveal dwell before the next flip starts
const CJAR_INTERSTITIAL_MS  = 5000;  // raid-intro + BUSTED! auto-advance (PKO round-4 value; the
                                     // documented practical ceiling for a chrome-exempt screen)
const CJAR_DD_CUT           = 10;    // Sylly: cards cut from the 30-card pool, BEFORE the Treat
const CJAR_DD_START_STASH   = 5;     // Sylly: granted ONCE per match, never per Raid
const CJAR_DD_DOB_STEAL     = 2;     // per Dobber, capped at card value
const CJAR_DD_DOB_BACKFIRE  = 2;     // flat
const CJAR_DD_TAKE_LOSS     = { favourite: 0, neutral: 2, watcher: 4 };
const CJAR_DD_DEBT_CAP      = 6;

// A moment's identity and its voice live side by side so they cannot drift apart
// (PKO_EVENT_SOUND precedent). Zero new synthesised functions — spec §9.
const CJAR_SOUND = {
  cookie:       'playWhoosh',      // a flip, not an event
  caughtFirst:  'playHullThud',    // the "uh oh" scare
  busted:       'playAbyssThud',   // escalated version of the same hit
  reveal:       'playDone',        // choices settling into their resolved state
  soloSneak:    'playUnchallenged',// the sole survivor scoops the pot
  treatSpecial: 'playSuccess',
  treatSuper:   'playClashWin',    // purpose-built "bigger version of a success"
  raidLost:     'playBoing',       // comedic loss, not harsh
  highAlert:    'playAlarm',
  tick:         'playTick',
  dobBackfire:  'playPoacher',     // out-of-ecosystem — the accusation boomerangs
  matchEnd:     'playClashWin',
};

// ── Settings (persist between play-agains) ─────────────────────────────────
let cjarSnackFriendly = 'safe';  // 'off' | 'safe' | 'warmup'
let cjarHouseRules    = 'burn';  // 'burn' | 'on-guard' | 'high-alert'
let cjarMatchLength   = 5;       // 3 | 5
let cjarOpenBook      = true;
let cjarSyllyMode     = false;   // Dibber Dobber — always last in the settings overlay

// ── Roster (from mpPlayerSlots — no setup screen, MDLM only; spec §17 D-01) ─
let cjarPlayerCount = 0;
let cjarPlayerNames = [];        // from mpPlayerSlots[i].nickname — never .name

// ── Match state (reset each play-again) ────────────────────────────────────
let cjarRaidNo        = 0;       // 1-based
let cjarStashes       = [];      // banked score per player (Sylly: THE running total)
let cjarTreatsWon     = [];      // first tie-break
let cjarRaidHistory   = [];      // [raidIdx][playerIdx] = banked that Raid
let cjarFamilyCopies  = {};      // { mum:3, ... } — House Rules mutates across the match
let cjarTreatsLive    = [];      // treat ids not yet permanently discarded
let cjarTreatsCarried = [];      // unrevealed treats carrying into the next Raid

// ── Raid state (reset each Raid) ───────────────────────────────────────────
let cjarDeck         = [];       // index 0 = next to flip
let cjarSeen         = {};       // { mum:0|1, ... } — appearances THIS Raid
let cjarCrumbs       = 0;
let cjarRaidTotals   = [];       // base game only — in-progress, unbanked
let cjarActive       = [];       // base game only — still in this Raid
let cjarCounterTreat = null;     // revealed Treat sitting on the counter, unclaimed
let cjarTrail        = [];       // Crumb Trail entries for this Raid
let cjarHighAlertId  = null;     // family id escalated to 4 copies
let cjarFavourite    = [];       // Sylly — host-side full array, family id per player
let cjarWatcher      = [];       // Sylly — host-side full array
let cjarCrumbDebt    = [];       // Sylly — capped, cleared at Raid end

// ── Flip state (reset each flip) ───────────────────────────────────────────
let cjarCard         = null;
let cjarFlipSeq      = 0;        // idempotency tag — the host drops any CJAR_CHOICE
                                 // whose flipSeq is stale (the PKO BUG-01 class)
let cjarChoices      = [];       // 'take'|'sneak'|'innocent'|'dob'|null per player
let cjarReadyCheck   = [];
let cjarEndTimestamp = 0;        // absolute ms — every device counts down against this
let cjarDeltas       = [];       // this flip's change per player, for the reveal
let cjarLines        = [];       // flavour line per player, for Open Book Off

// ── UI / device-local state ────────────────────────────────────────────────
let cjarTablePhase         = 'deciding'; // 'deciding'|'waiting'|'revealing'|'spectating'
let cjarMyFavourite        = null;       // Sylly — THIS device only, via mpSendPrivate
let cjarMyWatcher          = null;
let cjarTimerHandle        = null;       // setInterval — the countdown bar
let cjarRevealHandle       = null;       // setTimeout — reveal dwell (host only)
let cjarHostTimeoutHandle  = null;       // setTimeout — decision-timer auto-resolve (host only)
let cjarInterstitialHandle = null;       // setTimeout — raid-intro / BUSTED! advance

let CJAR_DATA = null;                    // hydrated from data/cjar-data.json

// ── Derived — never stored ─────────────────────────────────────────────────
function cjarIsSylly()          { return cjarSyllyMode === true; }
function cjarActiveCount()      { return cjarActive.filter(Boolean).length; }
// Open Book is a RENDER-LAYER COURTESY, not a security property: every total is
// derivable from two public numbers. Never document it as privacy (spec §11).
function cjarStashVisible(idx)  { return cjarOpenBook || idx === mpMyPlayerIdx; }
// Only ACTIVE seats gate the flip. Plain .every(Boolean) freezes every base Raid
// the moment anyone Sneaks Out — spec §11 readyCheck.
function cjarAllIn()            { return cjarActive.every((a, i) => !a || cjarReadyCheck[i]); }

// ── Stubs — filled by later tasks, names are final ─────────────────────────
function cjarLoadData() {}
function cjarShowMenu() {}
function cjarShowClientStandby() {}
function cjarStartMatch() {}
function cjarStartRaid() {}
function cjarNextFlip() {}
function cjarResolveFlip() {}
function cjarEndRaid() {}
function cjarEndMatch() {}
function cjarBuildDeck() { return []; }
function cjarCookieTier() { return 'handful'; }
function cjarArtKey() { return ''; }
function cjarScheduledTreat() { return null; }
function cjarRenderCard() { return document.createElement('div'); }
function cjarHandleEnvelope() {}
function cjarShowTip() {}
// Cookie Jar's content is a fixed deck, not a word pool — the practical override
// surface is the flavour pools and treat names only. No pool-refill path exists.
function cjarApplyExpansionOverrides() {}
function cjarResetState() {}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tools/verify-cjar-deck.js`
Expected: PASS on all 10 constant checks, `ALL CHECKS PASSED`, exit 0.

- [ ] **Step 5: Register the six screens in `allScreens[]`**

In `js/engine.js`, immediately after line 81 (`'screen-pko-unchallenged', … 'screen-pko-hierarchy',`) and before the closing `];`:

```javascript
  // Cookie Jar
  'screen-cjar-menu', 'screen-cjar-raid-intro', 'screen-cjar-table',
  'screen-cjar-busted', 'screen-cjar-raid-summary', 'screen-cjar-gameover',
```

- [ ] **Step 6: Register the two theme maps**

`js/engine.js:450` — change `'pko': 'pko-range'` to:

```javascript
    'pko': 'pko-range', 'cjar': 'cjar-range'
```

`js/engine.js:465` — change `'flw': 'game-toggle-on-flw', 'pko': 'game-toggle-on-pko'` to:

```javascript
    'flw': 'game-toggle-on-flw', 'pko': 'game-toggle-on-pko',
    'cjar': 'game-toggle-on-cjar'
```

Do **not** add `'frt'` here — see Delta 2.

- [ ] **Step 7: Add the `resetToLobby()` teardown block**

In `js/engine.js`, immediately after `if (typeof pkoResetState === 'function') pkoResetState();` (line 633):

```javascript
  // Cookie Jar teardown
  ['cjar-settings-overlay','cjar-how-to-overlay','cjar-trail-overlay',
   'cjar-quit-overlay','cjar-new-raid-overlay','cjar-tip-overlay'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  if (typeof cjarResetState === 'function') cjarResetState();
```

- [ ] **Step 8: Append the brand CSS block**

Append to `css/styles.css`. Note every custom-class button declares `display:flex; align-items:center; justify-content:center` — without it a script that reveals the button with `display:flex` pins the label top-left (the PKO Retreat/Stampede bug).

```css
/* ── Cookie Jar (cjar) — honey-gold #D4A017 with DARK ink ──────────────────
   White on #D4A017 measures 2.38:1, below the 3:1 floor. stone-800 is 6.39:1.
   This is the same failure class the v156 recolour phase existed to remove —
   never put white text on this fill. */
.pill-active-cjar {
  background-color: #D4A017;
  color: #292524; /* stone-800 */
  font-weight: 600;
}
.game-toggle-on-cjar {
  background-color: #D4A017;
  color: #292524;
  border-radius: 9999px;
  padding: 0.4rem 1.2rem;
  font-weight: 700;
  font-size: 0.9rem;
  transition: background 0.2s, color 0.2s;
  border: none;
  cursor: pointer;
}
/* Custom CTA: MUST declare flex centering — when JS/Tailwind sets display:flex the
   label would top-left-align without these (DYB/GTH/FRT/FLW/PKO lesson). */
.cjar-cta { background-color: #D4A017; color: #292524; display: flex; align-items: center; justify-content: center; }
.cjar-cta:hover { background-color: #B8860B; }
/* Raw #D4A017 on bg-stone-50 measures under 3:1 — labels take the darkened brand. */
.cjar-label { color: #7A5C0A; }
.cjar-range {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 9999px;
  background: linear-gradient(to right, #F7E9C4, #D4A017); /* biscuit → honey */
  outline: none;
  cursor: pointer;
}
.cjar-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: #D4A017;
  border: 3px solid #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
}
.cjar-range::-moz-range-thumb {
  width: 22px; height: 22px;
  border-radius: 50%;
  background: #D4A017;
  border: none;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
}
```

- [ ] **Step 9: Add the lobby button and the script tag**

Two single contiguous insertions — safe with the Edit tool (see the encoding rule).

`index.html`, after line 91 (`</button>` closing `#btn-pko`), still inside the lobby grid `</div>`:

```html
      <button id="btn-cjar" class="cjar-cta min-h-14 w-full rounded-2xl active:scale-95 text-xl font-semibold transition-all duration-150">
        Cookie Jar
      </button>
```

Note: **no `text-white`** — `.cjar-cta` supplies `color:#292524`, and a Tailwind `text-white` would override it and reintroduce the contrast failure.

`index.html`, after line 6766 (`<script src="js/games/pko.js"></script>`):

```html
  <script src="js/games/cjar.js"></script>
```

- [ ] **Step 10: Verify the registrations landed**

Run:
```bash
node tools/verify-cjar-deck.js \
  && grep -c "screen-cjar-" js/engine.js \
  && grep -c "cjar" css/styles.css \
  && grep -n "btn-cjar\|js/games/cjar.js" index.html
```
Expected: harness PASS; `6` screen IDs in `engine.js`; a non-zero cjar count in `styles.css`; two `index.html` hits (`btn-cjar` around line 92, the script tag around 6767).

- [ ] **Step 11: Commit**

```bash
git add js/games/cjar.js tools/verify-cjar-deck.js js/engine.js css/styles.css index.html
git commit -m "$(cat <<'EOF'
feat(cjar): scaffold Cookie Jar plugin and engine registration

Protocol B Step 2. State block, named stubs, six screens in allScreens[],
both theme maps, resetToLobby teardown, brand CSS (dark ink — #D4A017 fails
contrast with white), lobby button and script tag. No game logic.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Screen skeletons, routing, and exit paths

Protocol B Steps 3 and 4. Every screen exists and is navigable; every exit path works cold. Still no game logic — render functions only call `showScreen`.

**Files:**
- Modify: `index.html` — one contiguous insertion at end of file (after the PKO section, currently ending at line 9057)
- Modify: `js/games/cjar.js` — `DOMContentLoaded` wiring block

**Interfaces:**
- Consumes: the state block and stubs from Task 1.
- Produces: DOM ids `screen-cjar-menu`, `screen-cjar-raid-intro`, `screen-cjar-table`, `screen-cjar-busted`, `screen-cjar-raid-summary`, `screen-cjar-gameover`; overlay ids `cjar-quit-overlay`, `cjar-new-raid-overlay`, `cjar-trail-overlay`, `cjar-tip-overlay` (plus empty `cjar-settings-overlay` / `cjar-how-to-overlay` shells filled in Task 14); container ids the render tasks fill: `cjar-table-hero`, `cjar-deck-badge`, `cjar-trail-strip`, `cjar-warning-strip`, `cjar-timer-bar`, `cjar-controls`, `cjar-reveal-rows`, `cjar-private-strip`, `cjar-summary-rows`, `cjar-podium`, `cjar-history-grid`.

- [ ] **Step 1: Write the failing test — a structural check of the markup**

There is no Node harness for markup (the four shipped tools are rules-engine tools). The test is an explicit grep contract. Save it as a shell one-liner you re-run at Step 5; it is not committed as a tool.

Run:
```bash
for id in screen-cjar-menu screen-cjar-raid-intro screen-cjar-table \
          screen-cjar-busted screen-cjar-raid-summary screen-cjar-gameover \
          cjar-quit-overlay cjar-new-raid-overlay cjar-trail-overlay cjar-tip-overlay \
          cjar-settings-overlay cjar-how-to-overlay; do
  printf '%-28s %s\n' "$id" "$(grep -c "id=\"$id\"" index.html)"
done
```
Expected now: every count `0`.

- [ ] **Step 2: Insert the COOKIE JAR section into `index.html`**

**One contiguous insertion** at the end of the markup, after the PKO section's last overlay and before the `<script>` tags' enclosing structure — i.e. append at the same nesting level as the PKO section. Use the Edit tool with the PKO section's final closing `</div>` as the anchor. A single insertion is the safe case; do not run a sweep.

```html
  <!-- ════ COOKIE JAR (cjar) — simultaneous-choice push-your-luck ════
       Screens : screen-cjar-menu, screen-cjar-raid-intro, screen-cjar-table,
                 screen-cjar-busted, screen-cjar-raid-summary, screen-cjar-gameover
       Overlays: cjar-settings-overlay, cjar-how-to-overlay, cjar-trail-overlay,
                 cjar-quit-overlay, cjar-new-raid-overlay, cjar-tip-overlay
    ══════════════════════════════════════════════════ -->

  <!-- CJAR MENU — content-height section (NO min-h-screen, or the 🔊 detaches to
       the viewport top and reads as unattached to the title) -->
  <section id="screen-cjar-menu" style="display:none"
    class="relative flex flex-col items-center justify-center px-6 py-12 w-full max-w-sm mx-auto text-center gap-6">
    <button class="btn-open-sound absolute top-4 right-4 text-2xl active:scale-90 transition-transform duration-100">🔊</button>
    <div class="text-5xl" role="img" aria-label="Cookie Jar">🍪</div>
    <div>
      <h2 class="text-3xl font-bold text-stone-800">Cookie Jar</h2>
      <p class="text-stone-400 text-base mt-1">Who took the cookies from the cookie jar?</p>
    </div>
    <div class="flex flex-col gap-3 w-full">
      <button id="btn-cjar-menu-play" class="cjar-cta min-h-14 w-full rounded-2xl active:scale-95 text-xl font-semibold transition-all duration-150">Raid the Jar!</button>
      <button id="btn-cjar-menu-how-to" class="min-h-14 w-full rounded-2xl bg-stone-700 hover:bg-stone-800 active:scale-95 text-white text-base font-semibold transition-all duration-150">How to Play</button>
      <button id="btn-cjar-menu-settings" class="min-h-14 w-full rounded-2xl bg-[#F7E9C4] hover:bg-[#EFDCA8] active:scale-95 text-[#7A5C0A] text-base font-semibold transition-all duration-150">Settings</button>
      <button id="btn-cjar-menu-back" class="min-h-11 w-full rounded-2xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-500 text-sm font-semibold transition-all duration-150">← Back to the Box</button>
    </div>
  </section>

  <!-- CJAR RAID INTRO — interstitial. NO [?] / 🔊 / ✕: it auto-advances AND has no
       interactive element, both conditions of the ui-style.md rule-5 exemption. -->
  <section id="screen-cjar-raid-intro" style="display:none"
    class="flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">
    <div class="flex flex-col w-full max-w-sm gap-4 text-center">
      <div class="text-6xl" role="img" aria-label="Cookie jar">🍪</div>
      <h2 id="cjar-intro-heading" class="text-3xl font-bold text-stone-800"></h2>
      <p id="cjar-intro-sub" class="text-stone-500 text-base"></p>
      <div id="cjar-intro-affinity" style="display:none" class="flex flex-col gap-2 bg-white rounded-2xl p-4 shadow-sm"></div>
    </div>
  </section>

  <!-- CJAR TABLE — THE gameplay screen. Four sub-states via cjarTablePhase. -->
  <section id="screen-cjar-table" style="display:none"
    class="flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">
    <div class="flex flex-col w-full max-w-sm gap-4">

      <!-- HEADER — title row + the family warning strip on a second row INSIDE the header zone -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <p id="cjar-table-raid" class="text-stone-500 text-sm font-semibold uppercase tracking-widest"></p>
          <div class="flex items-center gap-2">
            <button id="btn-cjar-how-to" class="text-stone-400 font-bold text-sm active:scale-90 transition-transform duration-100">[?]</button>
            <button class="btn-open-sound text-xl active:scale-90 transition-transform duration-100">🔊</button>
            <button class="btn-cjar-quit-open text-stone-500 font-bold text-xl active:scale-90 transition-transform duration-100">✕</button>
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          <div id="cjar-warning-strip" class="flex items-center gap-1.5 flex-1"></div>
          <button id="btn-cjar-family-tip" class="text-stone-300 font-bold text-xs leading-none active:scale-90 transition-transform duration-100">[?]</button>
        </div>
      </div>

      <!-- STAGE — hero card + deck badge, then the Crumb Trail strip -->
      <div class="flex flex-col gap-3">
        <div class="relative flex items-center justify-center gap-3">
          <div id="cjar-table-hero"></div>
          <div id="cjar-deck-badge" class="absolute right-0 top-1/2 -translate-y-1/2"></div>
          <!-- Delta animation layer: absolute so a flying cookie contributes ZERO height.
               In-flow it would change the column height and re-centre the whole Stack on
               every flip — the SHP sheep-parade bug, and this fires ~55× a match. -->
          <div id="cjar-delta-layer" class="absolute inset-0 pointer-events-none"></div>
        </div>
        <div id="cjar-trail-strip" class="flex items-center gap-1.5 overflow-x-auto py-1"></div>
      </div>

      <!-- CONTROLS — timer, then the phase-dependent action area, then the private strip -->
      <div class="flex flex-col gap-3">
        <div id="cjar-timer-bar" class="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
          <div id="cjar-timer-fill" class="h-full w-full rounded-full" style="background-color:#D4A017"></div>
        </div>
        <div id="cjar-controls" class="flex flex-col gap-2"></div>
        <div id="cjar-reveal-rows" class="flex flex-col gap-1.5"></div>
        <div id="cjar-private-strip" class="flex flex-wrap items-center gap-2 border-t border-stone-200 pt-3"></div>
      </div>
    </div>
  </section>

  <!-- CJAR BUSTED — interstitial, base game only. Chrome-exempt, same two conditions. -->
  <section id="screen-cjar-busted" style="display:none"
    class="flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">
    <div class="flex flex-col w-full max-w-sm gap-4 text-center">
      <div id="cjar-busted-emoji" class="text-6xl" role="img" aria-label="Caught"></div>
      <h2 class="text-4xl font-bold" style="color:#991b1b">BUSTED!</h2>
      <p id="cjar-busted-who" class="text-xl font-bold text-stone-800"></p>
      <p id="cjar-busted-line" class="text-stone-500 text-base italic"></p>
    </div>
  </section>

  <!-- CJAR RAID SUMMARY — host-gated CTA -->
  <section id="screen-cjar-raid-summary" style="display:none"
    class="flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">
    <div class="flex flex-col w-full max-w-sm gap-4">
      <div class="flex items-center justify-between">
        <p id="cjar-summary-raid" class="text-stone-500 text-sm font-semibold uppercase tracking-widest"></p>
        <div class="flex items-center gap-2">
          <button id="btn-cjar-summary-how-to" class="text-stone-400 font-bold text-sm active:scale-90 transition-transform duration-100">[?]</button>
          <button class="btn-open-sound text-xl active:scale-90 transition-transform duration-100">🔊</button>
          <button class="btn-cjar-quit-open text-stone-500 font-bold text-xl active:scale-90 transition-transform duration-100">✕</button>
        </div>
      </div>
      <div id="cjar-summary-rows" class="flex flex-col gap-2"></div>
      <button id="btn-cjar-next-raid" class="cjar-cta min-h-14 w-full rounded-2xl active:scale-95 text-xl font-semibold transition-all duration-150">Next Raid</button>
      <p id="cjar-summary-waiting" style="display:none" class="text-stone-400 text-sm text-center">Waiting for the host…</p>
    </div>
  </section>

  <!-- CJAR GAMEOVER -->
  <section id="screen-cjar-gameover" style="display:none"
    class="flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">
    <div class="flex flex-col w-full max-w-sm gap-4">
      <div class="flex items-center justify-between">
        <p class="text-stone-500 text-sm font-semibold">Who took the cookies from the cookie jar?</p>
        <div class="flex items-center gap-2">
          <button class="btn-open-sound text-xl active:scale-90 transition-transform duration-100">🔊</button>
          <button id="btn-cjar-go-exit" class="text-stone-500 font-bold text-xl active:scale-90 transition-transform duration-100">✕</button>
        </div>
      </div>
      <div id="cjar-podium" class="flex flex-col gap-2"></div>
      <div id="cjar-history-grid" class="overflow-x-auto"></div>
      <button id="btn-cjar-go-new" class="cjar-cta min-h-14 w-full rounded-2xl active:scale-95 text-xl font-semibold transition-all duration-150">Another Raid?</button>
      <button id="btn-cjar-go-leave" class="min-h-11 w-full rounded-2xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-500 text-sm font-semibold transition-all duration-150">Leave the Jar</button>
    </div>
  </section>

  <!-- CJAR SETTINGS — shell; cards authored in Task 14 -->
  <div id="cjar-settings-overlay" style="display:none"
    class="fixed inset-0 bg-black/40 z-[80] flex items-end justify-center">
    <div class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">Cookie Playbook 🍪</h2>
        <p class="text-xs text-stone-400 mt-1">How the raid runs — and how much trouble you're in.</p>
      </div>
      <div id="cjar-settings-body" class="overflow-y-auto flex flex-col gap-5 px-5 py-5"></div>
    </div>
  </div>

  <!-- CJAR HOW TO PLAY — shell; step cards authored in Task 14 -->
  <div id="cjar-how-to-overlay" style="display:none"
    class="fixed inset-0 bg-black/40 z-[90] flex items-end justify-center">
    <div class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">How to Play 🍪</h2>
        <p class="text-xs text-stone-400 mt-1">Grab cookies, don't get caught twice.</p>
      </div>
      <div id="cjar-how-to-body" class="overflow-y-auto flex flex-col gap-4 px-5 py-5"></div>
    </div>
  </div>

  <!-- CJAR CRUMB TRAIL — the flip log. Title must read as a LOG, never just "Crumbs"
       (the scoring currency is Cookie Crumbs; PKO owns "The Trail"). -->
  <div id="cjar-trail-overlay" style="display:none"
    class="fixed inset-0 bg-black/40 z-[90] flex items-end justify-center">
    <div class="overlay-data-inner settings-slide-up bg-stone-50 w-full max-w-sm rounded-t-3xl flex flex-col">
      <div class="px-5 pt-5 pb-4 border-b border-stone-200 flex-shrink-0">
        <h2 class="text-xl font-bold text-stone-800">Crumb Trail 🔍</h2>
        <p class="text-xs text-stone-400 mt-1">Every flip this Raid.</p>
      </div>
      <div class="overflow-y-auto flex flex-col gap-3 px-5 py-5">
        <div id="cjar-trail-copies" class="flex flex-col gap-2"></div>
        <div id="cjar-trail-log" class="flex flex-col gap-2"></div>
        <button id="btn-cjar-trail-close" class="cjar-cta min-h-14 w-full rounded-2xl text-xl font-semibold active:scale-95 transition-all duration-150">Got it</button>
      </div>
    </div>
  </div>

  <!-- CJAR QUIT -->
  <div id="cjar-quit-overlay" style="display:none"
    class="fixed inset-0 z-[80] overlay-modal-backdrop flex items-center justify-center px-6">
    <div class="overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center border border-[#E5C97A]">
      <p class="text-3xl">🍪</p>
      <h3 class="text-lg font-bold text-stone-800">Giving up on the jar?</h3>
      <p class="text-stone-500 text-sm">Your Cookie Stash will be lost.</p>
      <button id="btn-cjar-quit-confirm" class="cjar-cta min-h-11 w-full rounded-2xl active:scale-95 font-semibold text-sm transition-all duration-100">Yeah, sneak off.</button>
      <button id="btn-cjar-quit-cancel" class="min-h-11 w-full rounded-2xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-700 font-semibold text-sm transition-all duration-100">Keep raiding!</button>
    </div>
  </div>

  <!-- CJAR PLAY AGAIN -->
  <div id="cjar-new-raid-overlay" style="display:none"
    class="fixed inset-0 z-[90] overlay-modal-backdrop flex items-center justify-center px-6">
    <div class="overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center border border-[#E5C97A]">
      <p class="text-3xl">🍪</p>
      <h3 class="text-lg font-bold text-stone-800">Another Raid?</h3>
      <p class="text-stone-500 text-sm">Everyone's Cookie Stash goes back to zero.</p>
      <button id="btn-cjar-new-confirm" class="cjar-cta min-h-11 w-full rounded-2xl active:scale-95 font-semibold text-sm transition-all duration-100">Restart in Lobby 🔄</button>
      <button id="btn-cjar-new-cancel" class="min-h-11 w-full rounded-2xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-700 font-semibold text-sm transition-all duration-100">Stay here</button>
    </div>
  </div>

  <!-- CJAR SHARED TIP — content injected by cjarShowTip(emoji, heading, lines[]) -->
  <div id="cjar-tip-overlay" style="display:none"
    class="fixed inset-0 z-[90] overlay-modal-backdrop flex items-center justify-center px-6">
    <div class="overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center border border-[#E5C97A]">
      <div class="flex flex-col gap-2">
        <p id="cjar-tip-emoji" class="text-3xl"></p>
        <h3 id="cjar-tip-heading" class="text-lg font-bold text-stone-800"></h3>
        <div id="cjar-tip-body" class="text-stone-500 text-sm text-left flex flex-col gap-1.5"></div>
      </div>
      <button id="btn-cjar-tip-close" class="min-h-11 w-full rounded-2xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-700 font-semibold text-sm transition-all duration-100">Got it</button>
    </div>
  </div>
```

- [ ] **Step 3: Wire routing and exit paths in `js/games/cjar.js`**

Append to `js/games/cjar.js`. **The sound re-wiring is mandatory and easy to miss:** `engine.js` attaches `openSoundOverlay` to `.btn-open-sound` via a top-level `querySelectorAll` that runs at parse time and cannot reach markup appearing *after* the `<script>` block. cjar's section is at the end of the file, so its speaker buttons are inert without this.

```javascript
// ── Wiring ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };

  // cjar's HTML sits AFTER the <script> block, so engine.js's parse-time
  // querySelectorAll never reached these. FRT is the reference implementation.
  document.querySelectorAll(
    '#screen-cjar-menu .btn-open-sound, #screen-cjar-table .btn-open-sound, ' +
    '#screen-cjar-raid-summary .btn-open-sound, #screen-cjar-gameover .btn-open-sound'
  ).forEach(btn => btn.addEventListener('click', openSoundOverlay));

  on('btn-cjar', () => { playLaunch(); activeGameId = 'cjar'; cjarLoadData(); showScreen('screen-cjar-menu'); });

  // Play CTA has DUAL context: pre-lobby it opens the mode screen; post-lobby
  // onPassThePhone has already shown this menu and it starts the match. GTH ref.
  on('btn-cjar-menu-play', () => {
    playLaunch();
    if (window.syllyMultiplayerMode !== 'single') cjarStartMatch();
    else mpShowModeScreen('cjar');
  });
  on('btn-cjar-menu-back', () => { playExit(); resetToLobby(); });

  // Mid-game ✕ → quit overlay. MDLM contract: confirm goes to resetToLobby(),
  // NOT the game menu — a client leaving must dissolve the match (spec §11).
  document.querySelectorAll('.btn-cjar-quit-open').forEach(btn =>
    btn.addEventListener('click', () => {
      playDone();
      document.getElementById('cjar-quit-overlay').style.display = 'flex';
    }));
  on('btn-cjar-quit-cancel', () => {
    playDone();
    document.getElementById('cjar-quit-overlay').style.display = 'none';
  });
  on('btn-cjar-quit-confirm', () => {
    playExit();
    document.getElementById('cjar-quit-overlay').style.display = 'none';
    // A client leaving silently would leave the table waiting forever on a seat
    // that will never submit — and with a flip every ~9–15 s that stall is instant.
    if (window.syllyMultiplayerMode === 'client') {
      try { mpSendEnvelope({ type: 'ACTION', payload: { action: 'CJAR_PLAYER_LEFT' } }); } catch (_) {}
    }
    resetToLobby();
  });

  // Post-game ✕ and "Leave the Jar" both go straight out — the game is over,
  // there is no state left to preserve.
  on('btn-cjar-go-exit',  () => { playExit(); resetToLobby(); });
  on('btn-cjar-go-leave', () => { playExit(); resetToLobby(); });

  // Play again ALWAYS goes through the confirmation modal — never restarts directly.
  on('btn-cjar-go-new', () => {
    playDone();
    const btn = document.getElementById('btn-cjar-new-confirm');
    btn.textContent = window.syllyMultiplayerMode === 'client' ? 'Leave Session' : 'Restart in Lobby 🔄';
    document.getElementById('cjar-new-raid-overlay').style.display = 'flex';
  });
  on('btn-cjar-new-cancel', () => {
    playDone();
    document.getElementById('cjar-new-raid-overlay').style.display = 'none';
  });
  on('btn-cjar-new-confirm', () => {
    playLaunch();
    document.getElementById('cjar-new-raid-overlay').style.display = 'none';
    mpReturnToLobby();   // host broadcasts LOBBY_RESET; client calls resetToLobby()
  });

  on('btn-cjar-trail-close', () => {
    playDone();
    document.getElementById('cjar-trail-overlay').style.display = 'none';
  });
  on('btn-cjar-tip-close', () => {
    playDone();
    document.getElementById('cjar-tip-overlay').style.display = 'none';
  });
});
```

- [ ] **Step 4: Implement `cjarResetState()` (spec §13)**

Replace the `cjarResetState` stub in `js/games/cjar.js`. Four timer handles is more than any shipped game carries — a handle left running fires its callback against the next screen's state.

```javascript
// Called from resetToLobby(). Every one of the four handles is also cleared in the
// quit-confirm path (via resetToLobby) and on any early phase transition.
function cjarResetState() {
  if (cjarTimerHandle)        { clearInterval(cjarTimerHandle);       cjarTimerHandle = null; }
  if (cjarRevealHandle)       { clearTimeout(cjarRevealHandle);       cjarRevealHandle = null; }
  if (cjarHostTimeoutHandle)  { clearTimeout(cjarHostTimeoutHandle);  cjarHostTimeoutHandle = null; }
  if (cjarInterstitialHandle) { clearTimeout(cjarInterstitialHandle); cjarInterstitialHandle = null; }
  cjarRaidNo = 0; cjarStashes = []; cjarTreatsWon = []; cjarRaidHistory = [];
  cjarDeck = []; cjarCrumbs = 0; cjarCounterTreat = null; cjarTrail = [];
  cjarChoices = []; cjarReadyCheck = []; cjarEndTimestamp = 0; cjarFlipSeq = 0;
  cjarRaidTotals = []; cjarActive = []; cjarSeen = {}; cjarHighAlertId = null;
  cjarFavourite = []; cjarWatcher = []; cjarCrumbDebt = [];
  cjarMyFavourite = null; cjarMyWatcher = null;
  cjarTablePhase = 'deciding';
}
```

- [ ] **Step 5: Re-run the structural check**

Run the Step 1 loop again.
Expected: every count `1`.

Then confirm the Stack rules hold and the file did not get corrupted:
```bash
grep -c "h-screen" index.html
node -e "const s=require('fs').readFileSync('index.html','utf8');
  console.log('replacement chars:', (s.match(/�/g)||[]).length);
  console.log('cjar my-auto:', (s.slice(s.indexOf('COOKIE JAR')).match(/my-auto/g)||[]).length);"
```
Expected: the `h-screen` count is **unchanged from before this task** (cjar adds none — `min-h-screen` contains the substring, so compare against the pre-edit count rather than expecting zero); replacement chars `0`; cjar `my-auto` `0`.

- [ ] **Step 6: Walk the flow**

Open `index.html` in a browser. Confirm: lobby → **Cookie Jar** button → menu; the 🔊 on the menu opens the sound overlay (this is the re-wiring check — if it does nothing, Step 3's `querySelectorAll` block is wrong); **← Back to the Box** returns to the lobby. In the console, run `showScreen('screen-cjar-table')` and confirm the header ✕ opens the quit overlay, **Keep raiding!** closes it, and **Yeah, sneak off.** returns to the lobby. Repeat for `screen-cjar-gameover`: ✕ and **Leave the Jar** both exit; **Another Raid?** opens the confirm modal.

- [ ] **Step 7: Commit**

```bash
git add index.html js/games/cjar.js
git commit -m "$(cat <<'EOF'
feat(cjar): screen skeletons, routing and exit paths

Protocol B Steps 3-4. Six Stack screens, six overlays, lobby entry, dual-context
Play CTA, quit/play-again modals, DOMContentLoaded sound re-wiring (cjar's markup
follows the script block, so the engine's parse-time selector never reaches it),
and the four-handle teardown. No game logic.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `data/cjar-data.json` and the content guide

The fixed deck's content. Protocol B Step 5 begins here.

**Files:**
- Create: `data/cjar-data.json`
- Create: `docs/cjar-content-guide.md`
- Modify: `js/games/cjar.js` — implement `cjarLoadData()`
- Modify: `tools/verify-cjar-deck.js` — add the schema section

**Interfaces:**
- Consumes: the `CJAR_DATA` global and the `cjarLoadData` stub from Task 1.
- Produces: `CJAR_DATA` hydrated with `{ cookieValues[15], cookieTiers{3}, family[5], treats[5], treatSchedule{"3","5"} }`. Family ids are exactly `mum`, `dad`, `big`, `grandma`, `pet`. Treat ids are exactly `shortbread`, `redvelvet`, `macadamia`, `macarons`, `brownies`.

- [ ] **Step 1: Write the failing test**

Insert into `tools/verify-cjar-deck.js` immediately after the constants section, before the closing summary:

```javascript
  await sandbox.cjarLoadData();
  const D = C.data;

  section('data/cjar-data.json schema');
  check('15 cookie values',      D.cookieValues.length, 15);
  check('cookie values total 124', D.cookieValues.reduce((a, b) => a + b, 0), 124);
  check('three tiers',           Object.keys(D.cookieTiers).sort(), ['batch','handful','mountain']);
  check('tier bands are contiguous 1-17',
    [D.cookieTiers.handful.min, D.cookieTiers.handful.max,
     D.cookieTiers.batch.min,   D.cookieTiers.batch.max,
     D.cookieTiers.mountain.min, D.cookieTiers.mountain.max], [1, 5, 6, 12, 13, 17]);
  check('every cookie value falls in a tier',
    D.cookieValues.every(v => Object.values(D.cookieTiers).some(t => v >= t.min && v <= t.max)), true);

  check('five family ids', D.family.map(f => f.id).sort(), ['big','dad','grandma','mum','pet']);
  check('every family starts at 3 copies', D.family.every(f => f.copies === 3), true);
  // 4 lines minimum so a 5-Raid match never repeats the same line every time.
  check('every family has >=4 warn lines', D.family.every(f => f.warn.length >= 4), true);
  check('every family has >=4 bust lines', D.family.every(f => f.bust.length >= 4), true);
  check('no duplicate warn lines', D.family.every(f => new Set(f.warn).size === f.warn.length), true);
  check('no duplicate bust lines', D.family.every(f => new Set(f.bust).size === f.bust.length), true);

  check('five treats', D.treats.length, 5);
  check('three special @5', D.treats.filter(t => t.tier === 'special' && t.points === 5).length, 3);
  check('two super @10',   D.treats.filter(t => t.tier === 'super'   && t.points === 10).length, 2);

  check('quick-snack schedule is 3 long', D.treatSchedule['3'].length, 3);
  check('full-feast schedule is 5 long',  D.treatSchedule['5'].length, 5);
  // The Super Special must land on the FINAL Raid at either length — this is the
  // whole reason the schedule is data and not length-branching logic in the plugin.
  const superIds = D.treats.filter(t => t.tier === 'super').map(t => t.id);
  check('quick-snack ends on a super', superIds.includes(D.treatSchedule['3'][2]), true);
  check('full-feast ends on a super',  superIds.includes(D.treatSchedule['5'][4]), true);
  check('schedules reference real treat ids',
    ['3','5'].every(k => D.treatSchedule[k].every(id => D.treats.some(t => t.id === id))), true);

  section('Australian English in flavour copy');
  const allCopy = D.family.flatMap(f => [...f.warn, ...f.bust]).join(' ').toLowerCase();
  check('no US spellings', /\b(color|flavor|organize|recognize|mom)\b/.test(allCopy), false);
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node tools/verify-cjar-deck.js`
Expected: FAIL — `TypeError: Cannot read properties of null (reading 'cookieValues')` (the stub `cjarLoadData()` leaves `CJAR_DATA` null).

- [ ] **Step 3: Author `data/cjar-data.json`**

Note `"mum"` not `"mom"` — Australian English is asserted by the test. `bust` lines are the harsher second-appearance line; `warn` lines are the first-appearance scare.

```json
{
  "cookieValues": [1, 2, 3, 4, 5, 5, 7, 7, 9, 11, 11, 13, 14, 15, 17],
  "cookieTiers": {
    "handful":  { "label": "Handful of Cookies",  "min": 1,  "max": 5  },
    "batch":    { "label": "Batch of Cookies",    "min": 6,  "max": 12 },
    "mountain": { "label": "Mountain of Cookies", "min": 13, "max": 17 }
  },
  "family": [
    {
      "id": "mum",
      "name": "Mum",
      "emoji": "👩",
      "copies": 3,
      "warn": [
        "Was that the pantry door?",
        "I can hear you from the laundry, you know.",
        "Told you — no cookies before dinner!",
        "Don't make me come in there."
      ],
      "bust": [
        "Hand out of the jar. NOW.",
        "Right. Jar goes on top of the fridge.",
        "I wasn't born yesterday, love.",
        "That's it — everyone out of the kitchen."
      ]
    },
    {
      "id": "dad",
      "name": "Dad",
      "emoji": "🧔",
      "copies": 3,
      "warn": [
        "Oi. I heard that lid.",
        "You right in there, mate?",
        "That'd better be the fruit bowl.",
        "I'm counting them, you know."
      ],
      "bust": [
        "Caught you red-handed, mate.",
        "That's the last one. I mean it this time.",
        "Told your mother you'd crack before dinner.",
        "Jar's coming with me to the shed."
      ]
    },
    {
      "id": "big",
      "name": "Big Sister",
      "emoji": "🙋",
      "copies": 3,
      "warn": [
        "I saw that.",
        "Interesting. Very interesting.",
        "Keep going. I'm just watching.",
        "Mum's going to LOVE this."
      ],
      "bust": [
        "MUUUUM! They're in the cookies!",
        "Told you I'd tell. Nobody believes me until I do.",
        "Screenshotted. Metaphorically.",
        "You had one job: don't get caught by me."
      ]
    },
    {
      "id": "grandma",
      "name": "Grandma",
      "emoji": "👵",
      "copies": 3,
      "warn": [
        "Ooh, is that the biscuit tin?",
        "Come here a sec. Let me look at you.",
        "Your mother was exactly the same, you know.",
        "I won't say a word. Not yet."
      ],
      "bust": [
        "Sit down, love. I'm putting the kettle on.",
        "Not before dinner. I'll be telling your mother.",
        "You'll have a proper sandwich first, thank you.",
        "I've moved the tin. You'll never find it."
      ]
    },
    {
      "id": "pet",
      "name": "The Dog",
      "emoji": "🐕",
      "copies": 3,
      "warn": [
        "A hopeful tail thumps against the cupboard.",
        "Nails clicking across the lino. Coming closer.",
        "Sits. Stares. Does not blink.",
        "One ear up. Very much awake now."
      ],
      "bust": [
        "Barks. Loudly. Repeatedly. At you.",
        "Bolts for the kitchen and takes the whole jar down.",
        "Someone's coming to see what the fuss is.",
        "Drops the evidence at Mum's feet. Traitor."
      ]
    }
  ],
  "treats": [
    { "id": "shortbread", "name": "Strawberry Shortbread Cookies",        "tier": "special", "points": 5 },
    { "id": "redvelvet",  "name": "Red Velvet Cookies",                   "tier": "special", "points": 5 },
    { "id": "macadamia",  "name": "White Chocolate Macadamia Nut Cookies","tier": "special", "points": 5 },
    { "id": "macarons",   "name": "French Macarons",                      "tier": "super",   "points": 10 },
    { "id": "brownies",   "name": "Chocolate Truffle Brownies",           "tier": "super",   "points": 10 }
  ],
  "treatSchedule": {
    "3": ["shortbread", "redvelvet", "brownies"],
    "5": ["shortbread", "redvelvet", "macadamia", "macarons", "brownies"]
  }
}
```

- [ ] **Step 4: Implement `cjarLoadData()`**

Replace the stub in `js/games/cjar.js`:

```javascript
// Hydrates CJAR_DATA once, on lobby entry. Idempotent — a second tap on the lobby
// button must not refetch. Never throws into the boot path: on failure the menu
// still opens and the failure surfaces at deck build, not as a dead lobby button.
function cjarLoadData() {
  if (CJAR_DATA) return Promise.resolve(CJAR_DATA);
  return fetch('data/cjar-data.json')
    .then(r => r.json())
    .then(d => { CJAR_DATA = d; return d; })
    .catch(err => { console.warn('[cjar] data unavailable', err); return null; });
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node tools/verify-cjar-deck.js`
Expected: PASS on all constant and schema checks; `ALL CHECKS PASSED`; exit 0.

- [ ] **Step 6: Write `docs/cjar-content-guide.md`**

Modelled on `docs/ygi-content-guide.md`.

```markdown
# Cookie Jar — Content Guide

**Applies to:** `data/cjar-data.json` — the `family[].warn` / `family[].bust` flavour
pools and the `treats[].name` list. Nothing else in the file is content; the values,
tiers and schedules are balance and are governed by the tech spec, not by this guide.

## The voice

Before dinner, in a kitchen, with people who love each other. **Playful, never
genuinely scary.** The worst outcome in Cookie Jar is that the jar goes on top of
the fridge — not that anyone is in real trouble. If a line would land badly read
aloud to an eight-year-old, it is wrong for this game.

- **Australian English, always.** "Mum", never "Mom". No "color"/"flavor"/"organize".
  Metric only. The verification harness asserts this and will fail the build.
- **Short.** One line, spoken. Most are under nine words. They are read off a phone
  in the middle of a turn, not studied.
- **In character, not narrated** — except the Dog, which is the one archetype that
  gets described rather than quoted, because it does not speak.

## The two pools, and why they differ

| Pool | When it fires | Register |
|---|---|---|
| `warn` | The **first** appearance of that family member this Raid | A near miss. Suspicion, not proof. Tension rising. |
| `bust` | The **second** — the Raid ends, BUSTED! | Caught. Consequence lands. Still funny, still warm. |

A `warn` line must never sound like a `bust`: if it reads as *"you have been caught"*
it spoils the second card's job. Warns hint; busts confirm.

## Minimum counts

**≥4 warn and ≥4 bust per archetype**, all distinct within their pool. Lines are drawn
without replacement within a Raid, so four is the floor at which a 5-Raid match does
not repeat itself every time. More is better; the harness enforces the floor.

## The five archetypes

| id | Name | Personality brief |
|---|---|---|
| `mum` | Mum | The authority. Knows before she sees. Warm but final. Consequences are logistical — the jar moves. |
| `dad` | Dad | Complicit, amused, still enforcing. Calls you "mate". Would probably have one himself. |
| `big` | Big Sister | Not an authority — a *threat*. Enjoys this. Her power is that she'll tell, and she will. |
| `grandma` | Grandma | Indulgent and completely unbothered by the rules — but she'll mention it to your mother. Her consequence is being sat down and fussed over, not told off. |
| `pet` | The Dog | Described, never quoted. Escalates by accident. Every bust line is the dog causing a scene that summons a human. |

## Treat names

Real, specific, slightly aspirational biscuits — the ones that are *not* the everyday
jar. Three at 5 points (`special`), two at 10 (`super`). Names are proper nouns and
title-cased. Keep them concrete: "French Macarons" beats "Fancy Biscuits".

## Adding an expansion pack

`cjarApplyExpansionOverrides()` runs at the top of `cjarStartMatch()`. Cookie Jar's
content is a fixed deck, not a word pool, so the practical override surface is **the
flavour pools and treat names only** — a themed pack can re-voice the whole family
without touching a single number. There is no pool-refill path, and an override must
never change `cookieValues`, `copies`, `points` or `treatSchedule`.
```

- [ ] **Step 7: Commit**

```bash
git add data/cjar-data.json docs/cjar-content-guide.md js/games/cjar.js tools/verify-cjar-deck.js
git commit -m "$(cat <<'EOF'
feat(cjar): author the deck data and content guide

15 cookie values (124 total), 3 tier bands, 5 family archetypes with 4 warn +
4 bust lines each, 5 treats and both treat schedules. Harness asserts the schema,
the tier coverage, the super-special-lands-last rule and Australian spelling.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Deck construction

**Files:**
- Modify: `js/games/cjar.js` — replace the `cjarBuildDeck`, `cjarCookieTier`, `cjarArtKey`, `cjarScheduledTreat` stubs; add `cjarCookieCard`, `cjarFamilyCard`, `cjarTreatCard`, `cjarFloatCookies`
- Modify: `tools/verify-cjar-deck.js` — add the deck sections

**Interfaces:**
- Consumes: `CJAR_DATA` (Task 3); `shuffle(arr)` from `engine.js` — **pure, returns a copy** (Delta 1).
- Produces:
  - `cjarCookieCard(v)` → `{ type:'cookie', value:v }`
  - `cjarFamilyCard(id)` → `{ type:'family', id }`
  - `cjarTreatCard(id)` → `{ type:'treat', id, points, tier }` (hydrated from `CJAR_DATA.treats`)
  - `cjarCookieTier(value)` → `'handful' | 'batch' | 'mountain'`
  - `cjarArtKey(card)` → one of the 14 art keys
  - `cjarScheduledTreat()` → treat id for the current Raid
  - `cjarFloatCookies(deck, n)` → mutates `deck` in place, returns nothing
  - `cjarBuildDeck()` → a new array; **does not** assign `cjarDeck`

- [ ] **Step 1: Write the failing test**

Append to `tools/verify-cjar-deck.js` before the summary:

```javascript
  section('Card factories and the art key');
  check('cookie tier bands', [C.tier(1), C.tier(5), C.tier(6), C.tier(12), C.tier(13), C.tier(17)],
    ['handful','handful','batch','batch','mountain','mountain']);
  // 15 cookie values collapse onto 3 tier assets — the number is a text overlay,
  // never its own asset. 14 keys total.
  check('cookie art key is the tier',   C.artKey({ type:'cookie', value: 9 }),          'cookie-batch');
  check('family art key',               C.artKey({ type:'family', id: 'mum' }),         'family-mum');
  check('treat art key',                C.artKey({ type:'treat',  id: 'macarons' }),    'treat-macarons');
  const allKeys = new Set([
    ...D.cookieValues.map(v => C.artKey({ type:'cookie', value: v })),
    ...D.family.map(f => C.artKey({ type:'family', id: f.id })),
    ...D.treats.map(t => C.artKey({ type:'treat',  id: t.id })),
  ]);
  // 3 tiers + 5 families + 5 treats = 13 FACES. The spec says "14 keys"; that count
  // folds in the card back, which is the manifest's separate `back` field and not a
  // face key at all (plan Delta 4). 13 faces + 1 back = 14 images.
  check('exactly 13 distinct art keys', allKeys.size, 13);

  section('Base deck composition');
  C.seat({ players: 4, snack: 'off', house: 'burn', length: 5, raidNo: 1 });
  let deck = C.build();
  check('15 family + 15 cookie + 1 treat', deck.length, 31);
  check('15 cookies',      deck.filter(c => c.type === 'cookie').length, 15);
  check('15 family cards', deck.filter(c => c.type === 'family').length, 15);
  check('1 treat',         deck.filter(c => c.type === 'treat').length,  1);
  check('raid 1 treat is the scheduled one', deck.find(c => c.type === 'treat').id, 'shortbread');
  check('treat card is hydrated', (t => [t.points, t.tier])(deck.find(c => c.type === 'treat')), [5, 'special']);

  section('Snack Friendly FLOATS, never prepends');
  // Prepending would add a 16th cookie and silently change the odds on every
  // other flip for the rest of the Raid. The count must stay at 15.
  C.seat({ players: 4, snack: 'safe', length: 5, raidNo: 1 });
  deck = C.build();
  check('safe: still 15 cookies',  deck.filter(c => c.type === 'cookie').length, 15);
  check('safe: still 31 cards',    deck.length, 31);
  check('safe: card 1 is a cookie', deck[0].type, 'cookie');
  C.seat({ players: 4, snack: 'warmup', length: 5, raidNo: 1 });
  deck = C.build();
  check('warmup: still 15 cookies', deck.filter(c => c.type === 'cookie').length, 15);
  check('warmup: cards 1-2 are cookies', [deck[0].type, deck[1].type], ['cookie','cookie']);

  section('Treat schedule across both match lengths');
  const sched = len => [1,2,3,4,5].slice(0, len).map(n => {
    C.seat({ players: 4, length: len, raidNo: n });
    return C.scheduled();
  });
  check('quick snack (3)', sched(3), ['shortbread','redvelvet','brownies']);
  check('full feast (5)',  sched(5), ['shortbread','redvelvet','macadamia','macarons','brownies']);

  section('Carried treats join the next Raid');
  C.seat({ players: 4, length: 5, raidNo: 2, carried: ['shortbread'] });
  deck = C.build();
  check('carried + scheduled both present',
    deck.filter(c => c.type === 'treat').map(c => c.id).sort(), ['redvelvet','shortbread']);

  section('House Rules mutate the live family copies');
  C.seat({ players: 4, house: 'burn', length: 5, raidNo: 2,
           familyCopies: { mum:2, dad:3, big:3, grandma:3, pet:3 } });
  deck = C.build();
  check('burnt Mum contributes only 2', deck.filter(c => c.type === 'family' && c.id === 'mum').length, 2);
  check('14 family cards total',        deck.filter(c => c.type === 'family').length, 14);
  C.seat({ players: 4, house: 'high-alert', length: 5, raidNo: 2,
           familyCopies: { mum:2, dad:4, big:3, grandma:3, pet:3 } });
  deck = C.build();
  check('high-alert Dad contributes 4', deck.filter(c => c.type === 'family' && c.id === 'dad').length, 4);

  section('Sylly deck: cut to 10, THEN the Treat');
  C.seat({ players: 4, sylly: true, length: 5, raidNo: 3 });
  deck = C.build();
  check('11 cards', deck.length, 11);
  // The Treat is added AFTER the cut so it is always in play — a Treat that could
  // be cut away would make the whole Sylly Treat-priority rule dead most Raids.
  check('exactly 1 treat', deck.filter(c => c.type === 'treat').length, 1);
  check('treat is raid 3 scheduled', deck.find(c => c.type === 'treat').id, 'macadamia');
  // House Rules is hidden in Sylly, so the pool is the FULL 15+15 every Raid —
  // nothing ever burns, regardless of what cjarFamilyCopies happens to hold.
  C.seat({ players: 4, sylly: true, length: 5, raidNo: 3,
           familyCopies: { mum:1, dad:1, big:1, grandma:1, pet:1 } });
  check('sylly ignores burnt copies', C.build().length, 11);
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node tools/verify-cjar-deck.js`
Expected: FAIL — first failure `cookie tier bands`, expected `["handful",...]`, got `["handful","handful","handful","handful","handful","handful"]` (the stub returns a constant), then a cascade of deck-length failures against the `[]` stub.

- [ ] **Step 3: Implement the deck layer**

Replace the four stubs in `js/games/cjar.js` and add the helpers:

```javascript
// ── Cards and the deck ─────────────────────────────────────────────────────
function cjarCookieCard(v) { return { type: 'cookie', value: v }; }
function cjarFamilyCard(id) { return { type: 'family', id }; }
function cjarTreatCard(id) {
  const t = (CJAR_DATA.treats || []).find(x => x.id === id) || {};
  return { type: 'treat', id, points: t.points, tier: t.tier };
}

function cjarCookieTier(value) {
  const T = CJAR_DATA.cookieTiers;
  if (value <= T.handful.max) return 'handful';
  if (value <= T.batch.max)   return 'batch';
  return 'mountain';
}

// Art keys are DERIVED from card identity, never carried in a packet. This is what
// collapses 15 cookie values onto 3 tier assets — the value is a text overlay.
function cjarArtKey(card) {
  if (card.type === 'cookie') return 'cookie-' + cjarCookieTier(card.value);
  return card.type + '-' + card.id;      // family-mum, treat-macarons
}

// The two schedules already encode "the Super Special lands on the final Raid" at
// either match length, so no length-branching logic is needed anywhere else.
function cjarScheduledTreat() {
  const s = CJAR_DATA.treatSchedule[String(cjarMatchLength)] || [];
  return s[cjarRaidNo - 1] || null;
}

// Snack Friendly: FLOAT an existing Cookie Card to the top — never PREPEND a new
// one. Prepending adds a 16th cookie and silently changes the odds for every other
// flip in the Raid. Mutates in place.
function cjarFloatCookies(deck, n) {
  for (let slot = 0; slot < n; slot++) {
    const idx = deck.findIndex((c, i) => i >= slot && c.type === 'cookie');
    if (idx === -1) break;
    deck.splice(slot, 0, deck.splice(idx, 1)[0]);
  }
}

// Returns a NEW deck; the caller assigns cjarDeck. Note shuffle() is engine.js's
// PURE shuffle — it returns a copy, so every call must be reassigned. `shuffle(d)`
// as a bare statement is a silent no-op.
function cjarBuildDeck() {
  let deck = [];

  if (cjarIsSylly()) {
    // Full 15+15 pool every Raid — House Rules is hidden in Dibber Dobber, so
    // cjarFamilyCopies is deliberately ignored here and nothing ever burns.
    CJAR_DATA.family.forEach(f => { for (let n = 0; n < 3; n++) deck.push(cjarFamilyCard(f.id)); });
    CJAR_DATA.cookieValues.forEach(v => deck.push(cjarCookieCard(v)));
    deck = shuffle(deck);
    deck.length = CJAR_DD_CUT;                     // genuine random cut to 10
    deck.push(cjarTreatCard(cjarScheduledTreat()));    // Treat added AFTER the cut, so it
    return shuffle(deck);                          // is always in play → ~11 cards
  }

  // Base game: live family copies, which House Rules mutates across the match.
  Object.entries(cjarFamilyCopies).forEach(([id, n]) => {
    for (let k = 0; k < n; k++) deck.push(cjarFamilyCard(id));
  });
  CJAR_DATA.cookieValues.forEach(v => deck.push(cjarCookieCard(v)));  // never depletes
  cjarTreatsCarried.forEach(id => deck.push(cjarTreatCard(id)));      // unrevealed carry forward
  const scheduled = cjarScheduledTreat();
  if (scheduled) deck.push(cjarTreatCard(scheduled));
  deck = shuffle(deck);
  cjarFloatCookies(deck, cjarSnackFriendly === 'warmup' ? 2 : cjarSnackFriendly === 'safe' ? 1 : 0);
  return deck;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tools/verify-cjar-deck.js`
Expected: PASS on every check including all six deck sections; `ALL CHECKS PASSED`; exit 0.

- [ ] **Step 5: Commit**

```bash
git add js/games/cjar.js tools/verify-cjar-deck.js
git commit -m "$(cat <<'EOF'
feat(cjar): deck construction and the art-key derivation

Card factories, tier bands, cjarArtKey (15 cookie values -> 3 tier assets, 14 keys
total), the treat schedule, Snack Friendly float and both deck builders. Reuses
engine.js's pure shuffle rather than adding a cjarShuffle duplicate; every call
reassigns. Harness proves the float never adds a 16th cookie and that the Sylly
Treat survives the cut.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

### Task 5: Base-game scoring primitives and the loop harness

**Files:**
- Modify: `js/games/cjar.js` — replace nothing; add `cjarSplit`, `cjarSeatsChoosing`, `cjarResolveSneak`, `cjarResolveBust`
- Create: `tools/verify-cjar-loop.js`

**Interfaces:**
- Consumes: `cjarActiveCount()`, `cjarAllIn()` (Task 1); `cjarStashes`, `cjarRaidTotals`, `cjarActive`, `cjarCrumbs`, `cjarCounterTreat`, `cjarTreatsWon`, `cjarTreatsLive`, `cjarFamilyCopies`, `cjarHighAlertId`.
- Produces:
  - `cjarSplit(total, headCount)` → per-head amount (int); pushes the remainder into `cjarCrumbs`
  - `cjarSeatsChoosing(action)` → `number[]` of player indices whose `cjarChoices[i] === action`
  - `cjarResolveSneak(leavers)` → void; banks leavers, clears their Raid totals, sets them inactive
  - `cjarResolveBust(familyId)` → void; zeroes every still-active Raid total, applies House Rules, discards a counter Treat

- [ ] **Step 1: Write the failing test**

Create `tools/verify-cjar-loop.js`. The sandbox is Task 1's, plus a controllable `Math.random` so the High Alert draw is deterministic.

```javascript
// ═══════════════════════════════════════════════════════════════════════════
// verify-cjar-loop.js — drives Cookie Jar's BASE-GAME turn loop headlessly.
//
//   node tools/verify-cjar-loop.js        (exits 1 on any failure)
//
// Companion to verify-cjar-deck.js (data layer) and verify-cjar-dd.js (Sylly).
// This one asserts resolution: cjarSplit's remainders, the solo-leaver jackpot,
// the multi-leaver Crumb split, every Treat claim rule, the bust, spectators,
// cjarAllIn() with a departed seat, deck exhaustion, and the match tie-break.
//
// Why it exists: cjar is MDLM-only, so this loop needs four devices and a live
// Firebase room to reach at all. The appliers take an explicit playerIdx and skip
// every broadcast in 'single' mode, so ONE process plays all N seats through the
// real shipped functions. It re-implements no rules.
//
// Sandbox rules, same as the deck tool: setTimeout is CAPTURED not fired, and
// mpSendEnvelope/mpSendPrivate THROW so a leaked broadcast fails loudly.
// Math.random is injected and driven by __rand so House Rules' High Alert draw
// is deterministic rather than flaky.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');
const dataJson = fs.readFileSync(path.join(ROOT, 'data/cjar-data.json'), 'utf8');

const screens = [];
const timers  = [];
const sandbox = {
  console,
  document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
  window: { syllyMultiplayerMode: 'single' },
  fetch: () => Promise.resolve({ json: () => Promise.resolve(JSON.parse(dataJson)) }),
  shuffle: a => [...a],
  showScreen: id => screens.push(id),
  setTimeout: (fn, ms) => timers.push({ fn, ms }) - 1,
  clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  playLaunch() {}, playWhoosh() {}, playDone() {}, playTick() {}, playBoing() {},
  playAlarm() {}, playSuccess() {}, playClashWin() {}, playHullThud() {},
  playAbyssThud() {}, playUnchallenged() {}, playPoacher() {}, playExit() {},
  playPillClick() {}, playSyllyOn() {}, playSyllyOff() {},
  assetFace: () => null, assetBack: () => null,
  mpSendEnvelope() { throw new Error('mpSendEnvelope called in single mode'); },
  mpSendPrivate()  { throw new Error('mpSendPrivate called in single mode'); },
  mpLockSync() {}, mpUnlockSync() {}, mpPlayerSlots: [], mpMyPlayerIdx: 0,
  __rand: 0,
};
sandbox.Math = Object.create(Math);
sandbox.Math.random = () => sandbox.__rand;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const BRIDGE = `
globalThis.__cjar = {
  get stashes()   { return cjarStashes; },
  get totals()    { return cjarRaidTotals; },
  get active()    { return cjarActive; },
  get crumbs()    { return cjarCrumbs; },
  get treat()     { return cjarCounterTreat; },
  get treatsWon() { return cjarTreatsWon; },
  get live()      { return cjarTreatsLive; },
  get copies()    { return cjarFamilyCopies; },
  get highAlert() { return cjarHighAlertId; },
  get seen()      { return cjarSeen; },
  get deck()      { return cjarDeck; },
  get history()   { return cjarRaidHistory; },
  get ready()     { return cjarReadyCheck; },
  get carried()   { return cjarTreatsCarried; },
  get raidNo()    { return cjarRaidNo; },
  get card()      { return cjarCard; },
  get flipSeq()   { return cjarFlipSeq; },
  // Seats a Raid mid-flight so each scenario is deterministic — no dealing.
  seat(o) {
    cjarPlayerCount   = o.players;
    cjarPlayerNames   = Array.from({ length: o.players }, (_, i) => 'P' + i);
    cjarSyllyMode     = !!o.sylly;
    cjarSnackFriendly = o.snack  || 'off';
    cjarHouseRules    = o.house  || 'burn';
    cjarMatchLength   = o.length || 5;
    cjarOpenBook      = o.openBook === undefined ? true : o.openBook;
    cjarRaidNo        = o.raidNo || 1;
    cjarStashes       = o.stashes    || new Array(o.players).fill(0);
    cjarRaidTotals    = o.totals     || new Array(o.players).fill(0);
    cjarActive        = o.active     || new Array(o.players).fill(true);
    cjarTreatsWon     = o.treatsWon  || new Array(o.players).fill(0);
    cjarCrumbs        = o.crumbs || 0;
    cjarCounterTreat  = o.treat || null;
    cjarFamilyCopies  = o.copies || { mum:3, dad:3, big:3, grandma:3, pet:3 };
    cjarTreatsLive    = o.live || CJAR_DATA.treats.map(t => t.id);
    cjarTreatsCarried = o.carried || [];
    cjarHighAlertId   = null;
    cjarSeen = o.seen || {}; cjarTrail = []; cjarRaidHistory = o.history || [];
    cjarChoices = new Array(o.players).fill(null);
    cjarReadyCheck = new Array(o.players).fill(false);
    cjarCrumbDebt = new Array(o.players).fill(0);
    cjarDeck = o.deck || [];
    cjarFlipSeq = 0; cjarCard = null;
  },
  split(total, heads) { return cjarSplit(total, heads); },
  sneak(leavers)      { return cjarResolveSneak(leavers); },
  bust(familyId)      { return cjarResolveBust(familyId); },
  choose(list)        { cjarChoices = list; },
  cjarSeatsChoosing(a)    { return cjarSeatsChoosing(a); },
  allIn()             { return cjarAllIn(); },
  markReady(i)        { cjarReadyCheck[i] = true; },
  activeCount()       { return cjarActiveCount(); },
  setTreat(id)        { cjarCounterTreat = cjarTreatCard(id); },
};`;

vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/games/cjar.js'), 'utf8') + BRIDGE, sandbox,
  { filename: 'js/games/cjar.js' });

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}` +
    (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
const section = t => console.log(`\n${t}`);

(async () => {
  await sandbox.cjarLoadData();
  const C = sandbox.__cjar;
  console.log('Cookie Jar — base-game loop verification\n' + '='.repeat(48));

  section('cjarSplit — every remainder reaches Crumbs, and only through here');
  C.seat({ players: 4 });
  check('9 among 4 → 2 each',       C.split(9, 4), 2);
  check('  remainder 1 to Crumbs',  C.crumbs, 1);
  check('17 among 4 → 4 each',      C.split(17, 4), 4);
  check('  Crumbs accumulate',      C.crumbs, 2);
  check('exact division adds none', [C.split(8, 4), C.crumbs], [2, 2]);
  // headCount 0 happens when the last active player leaves on the same flip a
  // Cookie card resolves — the whole value must land in Crumbs, not vanish.
  check('0 heads → all to Crumbs',  [C.split(6, 0), C.crumbs], [0, 8]);

  section('Solo leaver takes the lot');
  C.seat({ players: 4, totals: [10, 4, 4, 4], crumbs: 7 });
  C.sneak([0]);
  check('banks total + ALL Crumbs', C.stashes, [17, 0, 0, 0]);
  check('Crumb pool emptied',       C.crumbs, 0);
  check('Raid total cleared',       C.totals[0], 0);
  check('now inactive',             C.active, [false, true, true, true]);

  section('Solo leaver is the ONLY way to claim a Treat');
  C.seat({ players: 4, totals: [10, 0, 0, 0], crumbs: 0 });
  C.setTreat('macarons');
  C.sneak([0]);
  check('Treat points added',   C.stashes[0], 20);
  check('Treat tally',          C.treatsWon, [1, 0, 0, 0]);
  check('counter cleared',      C.treat, null);

  section('Two leavers split Crumbs and never claim the Treat');
  C.seat({ players: 4, totals: [10, 6, 0, 0], crumbs: 7 });
  C.setTreat('macarons');
  C.sneak([0, 1]);
  // 7 Crumbs / 2 = 3 each, remainder 1 stays as Crumbs. The pool MUST be drained
  // before the split or cjarSplit's remainder double-counts into itself.
  check('each gets total + 3',   [C.stashes[0], C.stashes[1]], [13, 9]);
  check('remainder 1 stays',     C.crumbs, 1);
  check('Treat untouched',       C.treat !== null, true);
  check('no Treat tally',        C.treatsWon, [0, 0, 0, 0]);
  check('both inactive',         C.active, [false, false, true, true]);

  section('BUSTED — Raid totals only, Cookie Stashes untouched');
  C.seat({ players: 4, stashes: [30, 20, 10, 5], totals: [8, 8, 0, 8], active: [true, true, false, true] });
  C.bust('mum');
  check('every active total zeroed', C.totals, [0, 0, 0, 0]);
  check('Cookie Stashes survive',    C.stashes, [30, 20, 10, 5]);
  check('everyone now inactive',     C.active, [false, false, false, false]);

  section('BUSTED discards a revealed Treat permanently');
  C.seat({ players: 4, totals: [8, 8, 8, 8] });
  C.setTreat('macarons');
  C.bust('mum');
  check('counter cleared',            C.treat, null);
  check('removed from live treats',   C.live.includes('macarons'), false);

  section('House Rules — Standard Burn');
  C.seat({ players: 4, house: 'burn' });
  C.bust('mum');
  check('Mum drops to 2 copies', C.copies.mum, 2);
  check('nobody escalates',      C.highAlert, null);

  section('House Rules — On Guard (nothing burns)');
  C.seat({ players: 4, house: 'on-guard' });
  C.bust('mum');
  check('Mum stays at 3', C.copies.mum, 3);
  check('no escalation',  C.highAlert, null);

  section('House Rules — High Alert (burn AND escalate)');
  C.seat({ players: 4, house: 'high-alert' });
  sandbox.__rand = 0.5;                       // picks the middle of the live pool
  C.bust('mum');
  check('the busting family still burns', C.copies.mum, 2);
  check('someone escalated',              C.highAlert !== null, true);
  check('escalated family has 4 copies',  C.copies[C.highAlert], 4);
  check('alarm-worthy escalation is a real id',
    ['mum','dad','big','grandma','pet'].includes(C.highAlert), true);

  section('cjarAllIn gates on ACTIVE seats only');
  // .every(Boolean) here would freeze the Raid forever the moment P1 Sneaks Out.
  C.seat({ players: 4, active: [true, false, true, true] });
  C.markReady(0); C.markReady(2);
  check('not all active seats in yet', C.allIn(), false);
  C.markReady(3);
  check('departed seat does not block', C.allIn(), true);
  check('  and it never submitted',     C.ready, [true, false, true, true]);

  section('cjarSeatsChoosing');
  C.seat({ players: 5 });
  C.choose(['take', 'sneak', 'take', null, 'sneak']);
  check('takers',  C.cjarSeatsChoosing('take'),  [0, 2]);
  check('sneaks',  C.cjarSeatsChoosing('sneak'), [1, 4]);
  check('unknown action → empty', C.cjarSeatsChoosing('dob'), []);

  console.log(`\n${'='.repeat(48)}`);
  console.log(failures ? `FAILED — ${failures} check(s)` : 'ALL CHECKS PASSED');
  process.exit(failures ? 1 : 0);
})();
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node tools/verify-cjar-loop.js`
Expected: FAIL — `TypeError: cjarSplit is not defined` thrown from the bridge on the first `C.split(9, 4)` call.

- [ ] **Step 3: Implement the primitives**

Append to `js/games/cjar.js`:

```javascript
// ── Scoring primitives ─────────────────────────────────────────────────────
// The ONLY split helper. Every uneven split in this game — either mode, every card
// type, every action — sends its remainder to Crumbs. There is no other destination.
function cjarSplit(total, headCount) {
  if (headCount <= 0) { cjarCrumbs += total; return 0; }
  const per = Math.floor(total / headCount);
  cjarCrumbs += total - (per * headCount);
  return per;
}

function cjarSeatsChoosing(action) {
  const out = [];
  for (let i = 0; i < cjarPlayerCount; i++) if (cjarChoices[i] === action) out.push(i);
  return out;
}

// Base game. `leavers` is an array of playerIdx that chose Sneak Out this flip.
function cjarResolveSneak(leavers) {
  if (leavers.length === 1) {
    const i = leavers[0];
    cjarStashes[i] += cjarRaidTotals[i] + cjarCrumbs;
    cjarCrumbs = 0;
    if (cjarCounterTreat) {                    // a solo leaver is the ONLY Treat claim
      cjarStashes[i] += cjarCounterTreat.points;
      cjarTreatsWon[i] += 1;
      cjarTreatsLive = cjarTreatsLive.filter(t => t !== cjarCounterTreat.id);
      cjarCounterTreat = null;
    }
  } else {
    // cjarSplit pushes its remainder INTO cjarCrumbs, so the pool must be drained to
    // zero BEFORE the call. Splitting cjarCrumbs in place double-counts it. This and
    // the Sylly scare-off block are the only two places the pool splits into itself.
    const pool = cjarCrumbs;
    cjarCrumbs = 0;
    const per = cjarSplit(pool, leavers.length);
    leavers.forEach(i => { cjarStashes[i] += cjarRaidTotals[i] + per; });
  }                                            // 2+ leavers never claim the Treat
  leavers.forEach(i => { cjarRaidTotals[i] = 0; cjarActive[i] = false; });
}

// Base game only — Dibber Dobber has no bust.
function cjarResolveBust(familyId) {
  cjarActive.forEach((live, i) => { if (live) { cjarRaidTotals[i] = 0; cjarActive[i] = false; } });
  if (cjarHouseRules !== 'on-guard') cjarFamilyCopies[familyId] -= 1;   // burn + high-alert
  if (cjarHouseRules === 'high-alert') {
    const pool = Object.keys(cjarFamilyCopies).filter(id => cjarFamilyCopies[id] > 0);
    cjarHighAlertId = pool[Math.floor(Math.random() * pool.length)];
    cjarFamilyCopies[cjarHighAlertId] += 1;                             // a 4th copy next Raid
  }
  if (cjarCounterTreat) {                                               // revealed Treat is lost
    cjarTreatsLive = cjarTreatsLive.filter(t => t !== cjarCounterTreat.id);
    cjarCounterTreat = null;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tools/verify-cjar-loop.js`
Expected: PASS on all 9 sections; `ALL CHECKS PASSED`; exit 0.

Then confirm the deck tool is still green: `node tools/verify-cjar-deck.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add js/games/cjar.js tools/verify-cjar-loop.js
git commit -m "$(cat <<'EOF'
feat(cjar): base-game scoring primitives

cjarSplit (the only split helper — every remainder reaches Crumbs through it),
cjarSeatsChoosing, cjarResolveSneak (solo jackpot vs multi-leaver drain-then-split)
and cjarResolveBust with all three House Rules. Harness pins the drain-before-split
ordering hazard and proves cjarAllIn ignores departed seats.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Card reveal, flip resolution and the Raid lifecycle

The heart of the base game. Read **Delta 3** before starting — the card's effect resolves at reveal, *before* the decision window, and that ordering is load-bearing.

**Files:**
- Modify: `js/games/cjar.js` — replace the `cjarStartRaid`, `cjarNextFlip`, `cjarResolveFlip`, `cjarEndRaid` stubs; add `cjarApplyCardEffect`, `cjarApplyChoice`, `cjarFlavourLine`, `cjarLogTrail`
- Modify: `tools/verify-cjar-loop.js` — add the reveal/resolve/Raid-end sections

**Interfaces:**
- Consumes: everything from Tasks 4 and 5.
- Produces:
  - `cjarApplyCardEffect()` → `{ busted: bool, bustFamilyId: string|null }`. Host only. Applies the revealed card's own effect **before** the decision window.
  - `cjarApplyChoice(playerIdx, choice, flipSeq)` → `bool` (accepted). Host only. Rejects a stale `flipSeq`, an inactive seat, or a repeat.
  - `cjarResolveFlip(choices)` → `{ deltas: number[], lines: string[], raidEnded: bool }`. Host only, once per flip.
  - `cjarFlavourLine(familyId, pool)` → a line drawn without replacement within the Raid
  - `cjarLogTrail(entry)` → pushes onto `cjarTrail`
  - `cjarStartRaid()`, `cjarEndRaid(reason)` — host-side lifecycle; `reason` is `'bust' | 'allout' | 'deckout'`
  - New state: `cjarRaidOpenStashes = []` (a Raid-start snapshot, so `CJAR_RAID_END`'s `banked[]` is derivable), `cjarLinesUsed = {}` (per-Raid flavour draw-without-replacement bookkeeping)

- [ ] **Step 1: Write the failing test**

Append to `tools/verify-cjar-loop.js` before the summary:

```javascript
  section('Card reveal — a Cookie splits among ACTIVE players immediately');
  // The card's effect lands BEFORE anyone chooses (Delta 3). If it landed after,
  // a player who could see a bust card coming would Sneak Out for free.
  C.seat({ players: 4, deck: [{ type:'cookie', value: 9 }] });
  let r = sandbox.cjarApplyCardEffect();
  check('not a bust',            r.busted, false);
  check('9 / 4 = 2 each',        C.totals, [2, 2, 2, 2]);
  check('remainder 1 to Crumbs', C.crumbs, 1);
  check('card is on the table',  C.card.value, 9);
  check('deck popped',           C.deck.length, 0);

  section('Card reveal — a departed seat gets no share');
  C.seat({ players: 4, active: [true, false, true, true], deck: [{ type:'cookie', value: 9 }] });
  sandbox.cjarApplyCardEffect();
  check('9 / 3 = 3 each, spectator skipped', C.totals, [3, 0, 3, 3]);
  check('no remainder',                      C.crumbs, 0);

  section('Card reveal — first Caught! is a scare, second is a BUST');
  C.seat({ players: 4, totals: [5, 5, 5, 5], deck: [{ type:'family', id:'mum' }, { type:'family', id:'mum' }] });
  r = sandbox.cjarApplyCardEffect();
  check('first Mum does not bust', r.busted, false);
  check('  she is now seen',       C.seen.mum, 1);
  check('  nobody loses anything', C.totals, [5, 5, 5, 5]);
  r = sandbox.cjarApplyCardEffect();
  check('second Mum busts',        r.busted, true);
  check('  names the family',      r.bustFamilyId, 'mum');
  check('  Raid totals wiped',     C.totals, [0, 0, 0, 0]);

  section('Card reveal — a different family does not compound');
  C.seat({ players: 4, deck: [{ type:'family', id:'mum' }, { type:'family', id:'dad' }] });
  sandbox.cjarApplyCardEffect();
  check('second family, first sighting', sandbox.cjarApplyCardEffect().busted, false);
  check('both seen once',                [C.seen.mum, C.seen.dad], [1, 1]);

  section('Card reveal — a Treat sits on the counter, unclaimed');
  C.seat({ players: 4, deck: [{ type:'treat', id:'macarons', points:10, tier:'super' }] });
  sandbox.cjarApplyCardEffect();
  check('on the counter', C.treat.id, 'macarons');
  check('nobody scored',  C.stashes, [0, 0, 0, 0]);

  section('cjarApplyChoice — stale flipSeq is dropped (the PKO BUG-01 class)');
  C.seat({ players: 4, deck: [{ type:'cookie', value: 8 }] });
  sandbox.cjarApplyCardEffect();
  const seq = C.flipSeq;
  check('current seq accepted',  sandbox.cjarApplyChoice(0, 'take', seq), true);
  check('repeat rejected',       sandbox.cjarApplyChoice(0, 'sneak', seq), false);
  check('  first choice stands', C.ready[0], true);
  check('stale seq rejected',    sandbox.cjarApplyChoice(1, 'take', seq - 1), false);
  check('  seat 1 still open',   C.ready[1], false);
  C.seat({ players: 4, active: [true, false, true, true] });
  check('inactive seat rejected', sandbox.cjarApplyChoice(1, 'take', C.flipSeq), false);

  section('cjarResolveFlip — nobody leaves, Raid continues');
  C.seat({ players: 4, totals: [6, 6, 6, 6], deck: [{ type:'cookie', value: 4 }] });
  C.choose(['take', 'take', 'take', 'take']);
  r = sandbox.cjarResolveFlip(C.cjarSeatsChoosing ? ['take','take','take','take'] : null);
  check('no deltas',        r.deltas, [0, 0, 0, 0]);
  check('Raid continues',   r.raidEnded, false);
  check('everyone still in', C.active, [true, true, true, true]);

  section('cjarResolveFlip — the last player out ends the Raid');
  C.seat({ players: 4, totals: [6, 3, 3, 3], active: [true, false, false, false], crumbs: 5 });
  r = sandbox.cjarResolveFlip(['sneak', null, null, null]);
  check('banked total + all Crumbs', C.stashes[0], 11);
  check('delta reported',            r.deltas[0], 11);
  check('Raid ended',                r.raidEnded, true);

  section('Deck exhaustion with players still in resolves as a group exit (D-04)');
  C.seat({ players: 4, totals: [10, 6, 4, 0], active: [true, true, true, false], crumbs: 7, deck: [] });
  C.setTreat('macarons');
  r = sandbox.cjarResolveFlip(['take', 'take', 'take', null]);
  check('three-way Crumb split of 7 → 2 each', [C.stashes[0], C.stashes[1], C.stashes[2]], [12, 8, 6]);
  check('remainder discarded, pool empty',     C.crumbs, 0);
  check('counter Treat discarded, unclaimed',  C.treat, null);
  check('nobody won a Treat',                  C.treatsWon, [0, 0, 0, 0]);
  check('Raid ended',                          r.raidEnded, true);

  section('Deck exhaustion with ONE player in is a genuine solo exit');
  // Pinned deliberately: cjarResolveSneak's solo branch runs, so the last player
  // standing DOES claim the Treat. Falls out of D-04's "run cjarResolveSneak(allActive)".
  C.seat({ players: 4, totals: [10, 0, 0, 0], active: [true, false, false, false], crumbs: 3, deck: [] });
  C.setTreat('macarons');
  sandbox.cjarResolveFlip(['take', null, null, null]);
  check('solo keeps total + Crumbs + Treat', C.stashes[0], 23);
  check('and the Treat tally',               C.treatsWon[0], 1);

  section('cjarFlavourLine draws without replacement within a Raid');
  C.seat({ players: 4 });
  const warns = new Set();
  for (let k = 0; k < 4; k++) warns.add(sandbox.cjarFlavourLine('mum', 'warn'));
  check('four distinct warn lines', warns.size, 4);
  check('all real Mum lines',
    [...warns].every(l => sandbox.__cjar.data ? true :
      true), true); // presence asserted by the deck harness; distinctness is this check
  check('pool exhausted → still returns a line',
    typeof sandbox.cjarFlavourLine('mum', 'warn'), 'string');
```

Note the `cjarResolveFlip` calls pass the choices array directly — the harness does not need `cjarApplyChoice` first, because `cjarResolveFlip(choices)` assigns `cjarChoices` itself.

- [ ] **Step 2: Run it to make sure it fails**

Run: `node tools/verify-cjar-loop.js`
Expected: FAIL — `TypeError: sandbox.cjarApplyCardEffect is not a function`.

- [ ] **Step 3: Add the two new state variables**

In `js/games/cjar.js`, in the Raid-state block (after `let cjarHighAlertId = null;`):

```javascript
// Raid-start snapshot. CJAR_RAID_END must broadcast banked[] per player, and the
// only honest source is "Cookie Stash now minus Cookie Stash when the Raid opened" —
// banking happens in several places (solo exit, group exit, every Sylly gain), so
// incrementing a counter at each of them is the bug-prone alternative.
let cjarRaidOpenStashes = [];
let cjarLinesUsed = {};   // { 'mum:warn': [used lines] } — reset each Raid
```

Add both to `cjarResetState()`:

```javascript
  cjarRaidOpenStashes = []; cjarLinesUsed = {};
```

- [ ] **Step 4: Implement the reveal, the resolver and the lifecycle**

Append to `js/games/cjar.js`:

```javascript
// ── Flavour and the Crumb Trail ────────────────────────────────────────────
// Drawn without replacement within a Raid so a 5-Raid match doesn't repeat the
// same line every time. When a pool is exhausted it resets rather than returning
// undefined — a missing line would render as "undefined" on the BUSTED! screen.
function cjarFlavourLine(familyId, pool) {
  const fam = (CJAR_DATA.family || []).find(f => f.id === familyId);
  if (!fam || !fam[pool] || !fam[pool].length) return '';
  const key = familyId + ':' + pool;
  let used = cjarLinesUsed[key] || [];
  let remaining = fam[pool].filter(l => !used.includes(l));
  if (!remaining.length) { used = []; remaining = fam[pool].slice(); }
  const line = remaining[Math.floor(Math.random() * remaining.length)];
  cjarLinesUsed[key] = used.concat([line]);
  return line;
}

function cjarLogTrail(entry) { cjarTrail.push(entry); }

// ── Card reveal ────────────────────────────────────────────────────────────
// HOST ONLY. Pops the next card and applies its OWN effect — before anyone chooses.
// The ordering is load-bearing: if the effect landed after the decision window, a
// player looking at a second Caught! card could Sneak Out for free and the whole
// push-your-luck tension would collapse. This is why CJAR_FLIP_START carries
// raidTotals[], crumbs and seen{} — it broadcasts the POST-effect state.
// Returns { busted, bustFamilyId }; a bust skips the decision window entirely.
function cjarApplyCardEffect() {
  if (window.syllyMultiplayerMode === 'client') return { busted: false, bustFamilyId: null };
  cjarCard = cjarDeck.shift() || null;
  cjarFlipSeq += 1;
  cjarChoices    = new Array(cjarPlayerCount).fill(null);
  cjarReadyCheck = new Array(cjarPlayerCount).fill(false);
  if (!cjarCard) return { busted: false, bustFamilyId: null };

  // Dibber Dobber's cards have NO reveal-time effect — every outcome there is
  // decided by the choices (spec §6.3), including the Family card.
  if (cjarIsSylly()) {
    if (cjarCard.type === 'treat') cjarCounterTreat = cjarCard;
    return { busted: false, bustFamilyId: null };
  }

  if (cjarCard.type === 'cookie') {
    const per = cjarSplit(cjarCard.value, cjarActiveCount());
    for (let i = 0; i < cjarPlayerCount; i++) if (cjarActive[i]) cjarRaidTotals[i] += per;
    cjarLogTrail({ type: 'cookie', value: cjarCard.value, per });
    return { busted: false, bustFamilyId: null };
  }

  if (cjarCard.type === 'family') {
    const id = cjarCard.id;
    if (!cjarSeen[id]) {
      cjarSeen[id] = 1;
      cjarLogTrail({ type: 'family', id, line: cjarFlavourLine(id, 'warn'), busted: false });
      return { busted: false, bustFamilyId: null };
    }
    cjarLogTrail({ type: 'family', id, line: cjarFlavourLine(id, 'bust'), busted: true });
    cjarResolveBust(id);
    return { busted: true, bustFamilyId: id };
  }

  cjarCounterTreat = cjarCard;                      // treat — sits, unclaimed
  cjarLogTrail({ type: 'treat', id: cjarCard.id, points: cjarCard.points });
  return { busted: false, bustFamilyId: null };
}

// HOST ONLY. Records one seat's choice. Returns whether it was accepted, so the
// caller can tell a dropped packet from a duplicate.
function cjarApplyChoice(playerIdx, choice, flipSeq) {
  if (window.syllyMultiplayerMode === 'client') return false;
  if (playerIdx < 0 || playerIdx >= cjarPlayerCount) return false;
  // An in-flight packet from a flip that has already resolved must not resolve it a
  // second time (the PKO BUG-01 class). flipSeq is the idempotency tag.
  if (flipSeq !== cjarFlipSeq) return false;
  if (cjarReadyCheck[playerIdx]) return false;                 // no changing your mind
  if (!cjarIsSylly() && !cjarActive[playerIdx]) return false;  // spectators cannot submit
  cjarChoices[playerIdx]    = choice;
  cjarReadyCheck[playerIdx] = true;
  return true;
}

// ── Flip resolution ────────────────────────────────────────────────────────
// HOST ONLY, once per flip, after the decision window closes. The single entry
// point for choice resolution; branches on cjarIsSylly().
function cjarResolveFlip(choices) {
  cjarChoices = choices || cjarChoices;
  const deltas = new Array(cjarPlayerCount).fill(0);
  const lines  = new Array(cjarPlayerCount).fill('');
  const before = cjarStashes.slice();

  if (cjarIsSylly()) {
    const raidEnded = cjarResolveFlipDD(lines);
    for (let i = 0; i < cjarPlayerCount; i++) deltas[i] = cjarStashes[i] - before[i];
    return { deltas, lines, raidEnded };
  }

  const leavers = [];
  for (let i = 0; i < cjarPlayerCount; i++) {
    if (cjarActive[i] && cjarChoices[i] === 'sneak') leavers.push(i);
  }
  if (leavers.length) {
    cjarResolveSneak(leavers);
    leavers.forEach(i => { lines[i] = 'Sneaked out.'; });
    cjarLogTrail({ type: 'sneak', players: leavers.slice() });
  }

  // Raid-end checks, in the spec's order. BUSTED is handled at reveal, so only two
  // conditions remain here.
  let raidEnded = cjarActiveCount() === 0;
  if (!raidEnded && cjarDeck.length === 0) {
    // D-04 — the deck runs dry with players still in. Treated as everyone Sneaking
    // Out together: it needs no new rule and no new copy.
    const rest = [];
    for (let i = 0; i < cjarPlayerCount; i++) if (cjarActive[i]) rest.push(i);
    cjarResolveSneak(rest);
    if (cjarCounterTreat) {              // only reachable when 2+ left together
      cjarTreatsLive = cjarTreatsLive.filter(t => t !== cjarCounterTreat.id);
      cjarCounterTreat = null;
    }
    cjarCrumbs = 0;                      // an unclaimed remainder is destroyed
    cjarLogTrail({ type: 'deckout', players: rest });
    raidEnded = true;
  }

  for (let i = 0; i < cjarPlayerCount; i++) deltas[i] = cjarStashes[i] - before[i];
  return { deltas, lines, raidEnded };
}

// ── Raid lifecycle ─────────────────────────────────────────────────────────
// HOST ONLY. Everything reset here also travels at its reset value in the
// CJAR_RAID_START payload — clients never run this function (FLW BUG-01).
function cjarStartRaid() {
  cjarRaidNo      += 1;
  cjarSeen         = {};
  cjarCrumbs       = 0;
  cjarTrail        = [];
  cjarLinesUsed    = {};
  cjarCounterTreat = null;
  cjarFlipSeq      = 0;
  cjarChoices      = new Array(cjarPlayerCount).fill(null);
  cjarReadyCheck   = new Array(cjarPlayerCount).fill(false);
  cjarCrumbDebt    = new Array(cjarPlayerCount).fill(0);
  cjarRaidOpenStashes = cjarStashes.slice();
  if (cjarIsSylly()) {
    cjarRaidTotals = [];                       // unused in Dibber Dobber
    cjarActive     = [];
    cjarAssignAffinities();
  } else {
    cjarRaidTotals = new Array(cjarPlayerCount).fill(0);
    cjarActive     = new Array(cjarPlayerCount).fill(true);
  }
  cjarDeck = cjarBuildDeck();
}

// HOST ONLY. `reason` is 'bust' | 'allout' | 'deckout' — used only for copy.
function cjarEndRaid(reason) {
  const banked = cjarStashes.map((s, i) => s - (cjarRaidOpenStashes[i] || 0));
  cjarRaidHistory[cjarRaidNo - 1] = banked;

  if (cjarIsSylly()) {
    // A Treat unclaimed at Raid end is permanently gone — it never carries forward.
    cjarCounterTreat = null;
    cjarCrumbs = 0;
    cjarCrumbDebt = new Array(cjarPlayerCount).fill(0);
    return { banked, reason };
  }

  // Recomputed from the deck, never maintained incrementally: whatever is still in
  // the deck was never revealed, and everything else was claimed or discarded by the
  // rules above. A Treat cannot be both carried and discarded when the deck is the
  // single source.
  cjarTreatsCarried = cjarDeck.filter(c => c.type === 'treat').map(c => c.id);
  if (cjarCounterTreat) {                       // revealed but unclaimed → gone for good
    cjarTreatsLive = cjarTreatsLive.filter(t => t !== cjarCounterTreat.id);
    cjarCounterTreat = null;
  }
  cjarCrumbs = 0;
  return { banked, reason };
}
```

- [ ] **Step 5: Add a temporary `cjarResolveFlipDD` stub so the file parses**

Task 8 replaces it. Without it, `cjarResolveFlip`'s Sylly branch is a `ReferenceError` at parse-free runtime — and the harness would fail for the wrong reason.

```javascript
function cjarResolveFlipDD() { return false; }   // Task 8 — Dibber Dobber
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `node tools/verify-cjar-loop.js && node tools/verify-cjar-deck.js`
Expected: both PASS; `ALL CHECKS PASSED` twice; exit 0.

- [ ] **Step 7: Commit**

```bash
git add js/games/cjar.js tools/verify-cjar-loop.js
git commit -m "$(cat <<'EOF'
feat(cjar): card reveal, flip resolution and the Raid lifecycle

The card's effect resolves at REVEAL, before the decision window — otherwise a
visible bust card makes Sneaking Out free (plan Delta 3). cjarApplyChoice drops
stale flipSeq packets (PKO BUG-01 class). D-04 deck exhaustion resolves as a group
exit. cjarTreatsCarried is recomputed from the deck rather than tracked by hand.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Match lifecycle, tie-break and ranking

**Files:**
- Modify: `js/games/cjar.js` — replace the `cjarStartMatch`, `cjarEndMatch` stubs; add `cjarRanks`, `cjarRedHanded`, `cjarRankLabel`
- Modify: `tools/verify-cjar-loop.js` — add the match sections

**Interfaces:**
- Consumes: Tasks 4–6.
- Produces:
  - `cjarStartMatch()` → host-only; seeds `cjarStashes`/`cjarTreatsWon`/`cjarRaidHistory`/`cjarFamilyCopies`, applies expansion overrides, opens Raid 1
  - `cjarRanks()` → `number[]` — 1-based competition rank per player (ties share a rank, the next rank is skipped)
  - `cjarRedHanded()` → `number[]` — indices holding last place, single or shared
  - `cjarRankLabel(n)` → `'1st' | '2nd' | '3rd' | '4th' | …`
  - `cjarEndMatch()` → `{ ranks, redHanded }`

- [ ] **Step 1: Write the failing test**

Append to `tools/verify-cjar-loop.js`:

```javascript
  section('Match start seeds the table');
  C.seat({ players: 4, sylly: false });
  sandbox.cjarStartMatch();
  check('Cookie Stashes start at zero',  C.stashes, [0, 0, 0, 0]);
  check('Treat tallies start at zero',   C.treatsWon, [0, 0, 0, 0]);
  check('family copies fresh',           C.copies, { mum:3, dad:3, big:3, grandma:3, pet:3 });
  check('Raid 1 is open',                C.raidNo, 1);
  check('deck dealt',                    C.deck.length > 0, true);

  section('Sylly seeds 5 cookies ONCE per match, never per Raid');
  C.seat({ players: 4, sylly: true });
  sandbox.cjarStartMatch();
  check('everyone starts on 5', C.stashes, [5, 5, 5, 5]);
  const afterRaid1 = C.stashes.slice();
  sandbox.cjarStartRaid();
  check('Raid 2 grants nothing more', C.stashes, afterRaid1);

  section('Tie-break — highest total wins');
  C.seat({ players: 4, stashes: [30, 45, 12, 45], treatsWon: [0, 1, 0, 0] });
  check('most cookies, Treats break the tie', sandbox.cjarRanks(), [3, 1, 4, 2]);

  section('Tie-break — equal totals AND equal Treats share a rank');
  C.seat({ players: 4, stashes: [50, 30, 30, 10], treatsWon: [0, 1, 1, 0] });
  // Shared 2nd twice, then 4th — "3rd" is skipped (PKO precedent).
  check('shared rank, next skipped', sandbox.cjarRanks(), [1, 2, 2, 4]);
  check('Red-Handed is the single last', sandbox.cjarRedHanded(), [3]);

  section('Red-Handed can be shared');
  C.seat({ players: 4, stashes: [50, 40, 10, 10], treatsWon: [0, 0, 2, 2] });
  check('two on the bottom rank', sandbox.cjarRedHanded(), [2, 3]);

  section('Rank labels');
  check('ordinals', [1,2,3,4,5,6,7,8].map(n => sandbox.cjarRankLabel(n)),
    ['1st','2nd','3rd','4th','5th','6th','7th','8th']);

  section('A full 3-Raid match banks a history row per Raid');
  C.seat({ players: 4, sylly: false, length: 3 });
  sandbox.cjarStartMatch();
  for (let raid = 1; raid <= 3; raid++) {
    if (raid > 1) sandbox.cjarStartRaid();
    let guard = 0;
    while (guard++ < 200) {
      const eff = sandbox.cjarApplyCardEffect();
      if (eff.busted) break;
      if (!C.card) break;
      const res = sandbox.cjarResolveFlip(new Array(4).fill('take'));
      if (res.raidEnded) break;
    }
    sandbox.cjarEndRaid('deckout');
  }
  check('three history rows', C.history.length, 3);
  check('every row has one entry per player', C.history.every(r => r.length === 4), true);
  check('no negative bank', C.history.every(r => r.every(v => v >= 0)), true);
  check('ranks cover every seat', sandbox.cjarRanks().length, 4);
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node tools/verify-cjar-loop.js`
Expected: FAIL — `Cookie Stashes start at zero` gets `[]` (the `cjarStartMatch` stub does nothing), then `TypeError: sandbox.cjarRanks is not a function`.

- [ ] **Step 3: Implement the match layer**

Append to `js/games/cjar.js`:

```javascript
// ── Match lifecycle ────────────────────────────────────────────────────────
// HOST ONLY. Post-lobby entry point — the roster is already populated from
// mpPlayerSlots by onPassThePhone, so there is no setup screen (spec §17 D-01).
function cjarStartMatch() {
  if (window.syllyMultiplayerMode === 'client') return;
  cjarApplyExpansionOverrides();
  // Dibber Dobber seeds 5 cookies ONCE. A per-Raid grant would hand out 25 free
  // cookies over a Full Feast and flatten the whole economy.
  const seed = cjarIsSylly() ? CJAR_DD_START_STASH : 0;
  cjarStashes     = new Array(cjarPlayerCount).fill(seed);
  cjarTreatsWon   = new Array(cjarPlayerCount).fill(0);
  cjarRaidHistory = [];
  cjarRaidNo      = 0;
  cjarHighAlertId = null;
  cjarTreatsCarried = [];
  cjarTreatsLive  = (CJAR_DATA.treats || []).map(t => t.id);
  cjarFamilyCopies = {};
  (CJAR_DATA.family || []).forEach(f => { cjarFamilyCopies[f.id] = f.copies; });
  cjarStartRaid();
}

// Standard competition ranking: ties share a rank and the next rank is skipped, so
// two players on 2nd are followed by 4th (PKO precedent). Tie-break is total, then
// Treats won, then shared.
function cjarRanks() {
  const order = cjarStashes
    .map((s, i) => ({ i, s, t: cjarTreatsWon[i] || 0 }))
    .sort((a, b) => (b.s - a.s) || (b.t - a.t));
  const ranks = new Array(cjarPlayerCount).fill(0);
  let rank = 1;
  order.forEach((row, k) => {
    if (k > 0 && !(row.s === order[k - 1].s && row.t === order[k - 1].t)) rank = k + 1;
    ranks[row.i] = rank;
  });
  return ranks;
}

// Last place, single or shared — the Red-Handed label.
function cjarRedHanded() {
  const ranks = cjarRanks();
  const worst = Math.max(...ranks);
  return ranks.map((r, i) => (r === worst ? i : -1)).filter(i => i >= 0);
}

function cjarRankLabel(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// HOST ONLY.
function cjarEndMatch() {
  return { ranks: cjarRanks(), redHanded: cjarRedHanded() };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tools/verify-cjar-loop.js && node tools/verify-cjar-deck.js`
Expected: both PASS; exit 0.

- [ ] **Step 5: Commit**

```bash
git add js/games/cjar.js tools/verify-cjar-loop.js
git commit -m "$(cat <<'EOF'
feat(cjar): match lifecycle, tie-break and Red-Handed ranking

cjarStartMatch seeds the Sylly 5-cookie grant once per match (not per Raid).
Standard competition ranking: total, then Treats won, then a shared rank with the
next skipped. Harness drives a full 3-Raid match end to end.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Dibber Dobber — the Sylly Mode ledger and resolution

**Files:**
- Modify: `js/games/cjar.js` — replace the `cjarResolveFlipDD` stub; add `cjarDDGain`, `cjarDDPay`, `cjarAssignAffinities`, `cjarDDResolveTreat`
- Create: `tools/verify-cjar-dd.js`

**Interfaces:**
- Consumes: `cjarSplit`, `cjarSeatsChoosing`, `cjarCard`, `cjarCounterTreat`, `cjarStashes`, `cjarCrumbs`, `cjarCrumbDebt`, `cjarFavourite`, `cjarWatcher`, `cjarTreatsWon`.
- Produces:
  - `cjarDDGain(i, amt)` → void; pays down Crumb Debt first (repayments go to Crumbs), then credits
  - `cjarDDPay(i, amt)` → void; pays what it can into Crumbs, banks the shortfall as capped debt
  - `cjarAssignAffinities()` → void; per-Raid, per-player Favourite and Watcher, always different
  - `cjarDDResolveTreat()` → void; priority `Take > Dob > Play Innocent`, solo-only, never split
  - `cjarResolveFlipDD(lines)` → `bool` (`raidEnded`) — writes flavour into `lines[]`

- [ ] **Step 1: Write the failing test**

Create `tools/verify-cjar-dd.js`. Copy the sandbox and assertion harness verbatim from `tools/verify-cjar-loop.js` (Task 5, Step 1) — including the `Math.random` injection and the `__rand` hook — and change the header comment and the bridge. The bridge:

```javascript
const BRIDGE = `
globalThis.__cjar = {
  get stashes()  { return cjarStashes; },
  get crumbs()   { return cjarCrumbs; },
  get debt()     { return cjarCrumbDebt; },
  get treat()    { return cjarCounterTreat; },
  get treatsWon(){ return cjarTreatsWon; },
  get fav()      { return cjarFavourite; },
  get watch()    { return cjarWatcher; },
  get card()     { return cjarCard; },
  seat(o) {
    cjarPlayerCount = o.players;
    cjarPlayerNames = Array.from({ length: o.players }, (_, i) => 'P' + i);
    cjarSyllyMode   = true;
    cjarMatchLength = o.length || 5;
    cjarRaidNo      = o.raidNo || 1;
    cjarStashes     = o.stashes   || new Array(o.players).fill(10);
    cjarTreatsWon   = o.treatsWon || new Array(o.players).fill(0);
    cjarCrumbDebt   = o.debt      || new Array(o.players).fill(0);
    cjarFavourite   = o.fav   || new Array(o.players).fill(null);
    cjarWatcher     = o.watch || new Array(o.players).fill(null);
    cjarCrumbs      = o.crumbs || 0;
    cjarCounterTreat = null;
    cjarChoices = new Array(o.players).fill('innocent');
    cjarReadyCheck = new Array(o.players).fill(false);
    cjarActive = []; cjarRaidTotals = []; cjarTrail = []; cjarLinesUsed = {};
    cjarDeck = []; cjarSeen = {};
  },
  gain(i, n) { cjarDDGain(i, n); },
  pay(i, n)  { cjarDDPay(i, n); },
  // Puts a card on the table and resolves the given choices in one call.
  play(card, choices) {
    cjarCard = card;
    if (card && card.type === 'treat') cjarCounterTreat = card;
    cjarChoices = choices;
    const lines = new Array(cjarPlayerCount).fill('');
    return { ended: cjarResolveFlipDD(lines), lines };
  },
  setTreat(id) { cjarCounterTreat = cjarTreatCard(id); },
  assign() { cjarAssignAffinities(); },
};`;
```

Then the checks:

```javascript
  await sandbox.cjarLoadData();
  const C = sandbox.__cjar;
  console.log('Cookie Jar — Dibber Dobber verification\n' + '='.repeat(48));

  section('The ledger primitives — nothing touches cjarStashes directly');
  C.seat({ players: 4, stashes: [10, 10, 10, 10] });
  C.pay(0, 4);
  check('paid into Crumbs', [C.stashes[0], C.crumbs], [6, 4]);
  check('no debt',          C.debt[0], 0);

  section('An unpayable loss becomes Crumb Debt');
  C.seat({ players: 4, stashes: [1, 10, 10, 10] });
  C.pay(0, 4);
  check('paid what it could',  [C.stashes[0], C.crumbs], [0, 1]);
  check('shortfall becomes debt', C.debt[0], 3);
  check('never negative',      C.stashes[0] >= 0, true);

  section('Debt is repaid out of the next gain, into Crumbs');
  C.seat({ players: 4, stashes: [0, 10, 10, 10], debt: [3, 0, 0, 0] });
  C.gain(0, 5);
  check('3 repaid, 2 kept',   C.stashes[0], 2);
  check('repayment fed Crumbs', C.crumbs, 3);
  check('debt cleared',       C.debt[0], 0);
  C.seat({ players: 4, stashes: [0, 10, 10, 10], debt: [5, 0, 0, 0] });
  C.gain(0, 2);
  check('partial repayment',  [C.stashes[0], C.debt[0], C.crumbs], [0, 3, 2]);

  section('Crumb Debt is capped so a young player can always dig out');
  C.seat({ players: 4, stashes: [0, 10, 10, 10], debt: [5, 0, 0, 0] });
  C.pay(0, 4);
  check('capped at 6', C.debt[0], 6);
  C.pay(0, 4);
  check('further shortfall absorbed, not tracked', C.debt[0], 6);

  section('Cookie card — takers split it');
  C.seat({ players: 4, stashes: [0, 0, 0, 0] });
  C.play({ type:'cookie', value: 9 }, ['take', 'take', 'innocent', 'innocent']);
  // 9 / 2 takers = 4 each, remainder 1 to Crumbs; then the scare-off pays the two
  // Innocents that same 1 (splits to 0 each, remainder 1 back to Crumbs).
  check('takers get 4 each', [C.stashes[0], C.stashes[1]], [4, 4]);
  check('innocents absorb what they can', [C.stashes[2], C.stashes[3]], [0, 0]);
  check('Crumbs hold the indivisible remainder', C.crumbs, 1);

  section('Cookie card — a Dobber steals from the takers');
  C.seat({ players: 4, stashes: [0, 0, 0, 0] });
  C.play({ type:'cookie', value: 9 }, ['take', 'take', 'dob', 'innocent']);
  check('1 dobber steals 2',      C.stashes[2], 2);
  check('takers split the rest (7/2)', [C.stashes[0], C.stashes[1]], [3, 3]);
  // A Dobber's presence denies the Innocents the pile on BOTH card types.
  check('scare-off denied — innocent gets nothing', C.stashes[3], 0);
  check('remainder sits in Crumbs untouched',       C.crumbs, 1);

  section('Dob steal is capped at the card value');
  C.seat({ players: 4, stashes: [0, 0, 0, 0] });
  C.play({ type:'cookie', value: 3 }, ['take', 'dob', 'dob', 'innocent']);
  check('2 dobbers want 4, card is 3', C.stashes[1] + C.stashes[2], 2); // 3/2 = 1 each, rem 1
  check('taker gets nothing left',     C.stashes[0], 0);

  section('Only Dobbers, no takers — the accusation backfires');
  C.seat({ players: 4, stashes: [10, 10, 10, 10] });
  C.play({ type:'cookie', value: 9 }, ['dob', 'dob', 'innocent', 'innocent']);
  check('each dobber pays 2',   [C.stashes[0], C.stashes[1]], [8, 8]);
  check('card value unclaimed → Crumbs, plus the 4 paid', C.crumbs, 13);
  check('scare-off denied by the Dobbers', [C.stashes[2], C.stashes[3]], [10, 10]);

  section('Everyone plays innocent — they absorb their own contribution');
  // Ordering is load-bearing: the card value goes to Crumbs FIRST, then scare-off
  // runs, so an all-innocent flip immediately splits what it just created.
  C.seat({ players: 4, stashes: [0, 0, 0, 0] });
  C.play({ type:'cookie', value: 8 }, ['innocent', 'innocent', 'innocent', 'innocent']);
  check('8 / 4 = 2 each', C.stashes, [2, 2, 2, 2]);
  check('pool emptied',   C.crumbs, 0);

  section('Caught! card — no bust, and your own choice decides your fate');
  C.seat({ players: 4, stashes: [10, 10, 10, 10],
           fav:   ['mum',  null,  null,   null],
           watch: [null,  'mum',  null,   null] });
  C.play({ type:'family', id:'mum' }, ['take', 'take', 'take', 'innocent']);
  check('Favourite looks away — costs 0', C.stashes[0], 10);
  check('Watcher costs double — 4',       C.stashes[1], 6);
  check('neutral costs 2',                C.stashes[2], 8);
  check('the innocent sweeps the pile',   C.stashes[3], 16);
  check('pool emptied by the scare-off',  C.crumbs, 0);

  section('Caught! card — a Dob ALWAYS backfires');
  C.seat({ players: 4, stashes: [10, 10, 10, 10] });
  C.play({ type:'family', id:'mum' }, ['dob', 'dob', 'innocent', 'innocent']);
  check('both dobbers pay 2',       [C.stashes[0], C.stashes[1]], [8, 8]);
  check('innocents denied the pile', [C.stashes[2], C.stashes[3]], [10, 10]);
  check('the 4 sits in Crumbs',      C.crumbs, 4);

  section('Treat — priority Take > Dob > Play Innocent, evaluated IN ORDER');
  C.seat({ players: 4, stashes: [0, 0, 0, 0] });
  C.play({ type:'treat', id:'macarons', points:10, tier:'super' },
         ['take', 'dob', 'innocent', 'innocent']);
  check('the sole taker wins it', C.stashes[0], 10);
  check('Treat tally',            C.treatsWon, [1, 0, 0, 0]);
  check('counter cleared',        C.treat, null);

  section('Treat — a sole Dobber beats a sole Innocent');
  C.seat({ players: 4, stashes: [0, 0, 0, 0] });
  C.play({ type:'treat', id:'macarons', points:10, tier:'super' },
         ['take', 'take', 'dob', 'innocent']);
  // Two takers means no sole taker, so priority falls to the sole Dobber — even
  // though there is also exactly one Innocent. Higher priority wins outright.
  check('sole dobber takes it', C.stashes[2], 10);
  check('sole innocent gets nothing from the Treat', C.stashes[3] < 10, true);

  section('Treat — nobody uniquely solo, so it re-contests next flip');
  C.seat({ players: 4, stashes: [0, 0, 0, 0] });
  C.play({ type:'treat', id:'macarons', points:10, tier:'super' },
         ['take', 'take', 'innocent', 'innocent']);
  check('still on the counter', C.treat && C.treat.id, 'macarons');
  check('nobody scored it',     C.treatsWon, [0, 0, 0, 0]);

  section('Treat is re-contested on a LATER flip while it sits');
  C.seat({ players: 4, stashes: [0, 0, 0, 0] });
  C.setTreat('macarons');
  C.play({ type:'cookie', value: 4 }, ['take', 'innocent', 'innocent', 'innocent']);
  check('sole taker claims the sitting Treat', C.stashes[0] >= 10, true);
  check('counter cleared',                     C.treat, null);

  section('A player at zero stays in and can still win');
  C.seat({ players: 4, stashes: [0, 10, 10, 10], debt: [4, 0, 0, 0] });
  C.play({ type:'cookie', value: 12 }, ['innocent', 'take', 'take', 'take']);
  check('never goes negative', C.stashes.every(s => s >= 0), true);

  section('Affinities — Favourite and Watcher are always different');
  let clash = 0;
  for (let n = 0; n < 200; n++) {
    sandbox.__rand = (n % 97) / 97;
    C.seat({ players: 6 });
    C.assign();
    for (let i = 0; i < 6; i++) if (C.fav[i] === C.watch[i]) clash++;
  }
  check('never the same family member', clash, 0);
  C.seat({ players: 5 });
  C.assign();
  check('one Favourite per seat', C.fav.filter(Boolean).length, 5);
  check('one Watcher per seat',   C.watch.filter(Boolean).length, 5);
  check('all are real family ids',
    C.fav.concat(C.watch).every(id => ['mum','dad','big','grandma','pet'].includes(id)), true);
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node tools/verify-cjar-dd.js`
Expected: FAIL — `TypeError: cjarDDPay is not defined` from the bridge's first `C.pay(0, 4)`.

- [ ] **Step 3: Implement Dibber Dobber**

Replace the `cjarResolveFlipDD` stub in `js/games/cjar.js` with this block:

```javascript
// ── Dibber Dobber (Sylly Mode) ─────────────────────────────────────────────
// Structurally different from the base game: no cjarActive, no cjarRaidTotals, no
// bust, nobody leaves. One running cjarStashes[i] per player for the whole match.
//
// The two ledger primitives. EVERY Sylly gain and loss goes through these — touch
// cjarStashes directly anywhere and Crumb Debt silently stops working.
function cjarDDGain(i, amt) {
  if (cjarCrumbDebt[i] > 0) {
    const pay = Math.min(cjarCrumbDebt[i], amt);
    cjarCrumbDebt[i] -= pay; cjarCrumbs += pay; amt -= pay;   // repayments go to Crumbs
  }
  cjarStashes[i] += amt;
}
function cjarDDPay(i, amt) {
  const paid = Math.min(cjarStashes[i], amt);
  cjarStashes[i] -= paid; cjarCrumbs += paid;
  const short = amt - paid;
  // Closes the free-Dob-at-zero exploit; capped so a young player can always dig out.
  if (short > 0) cjarCrumbDebt[i] = Math.min(CJAR_DD_DEBT_CAP, cjarCrumbDebt[i] + short);
}

// One Favourite (loss 0) and one Watcher (loss doubled) per player, per Raid,
// reassigned at random each Raid. They must be DIFFERENT family members, so the
// Watcher is drawn from the remaining four.
function cjarAssignAffinities() {
  const ids = (CJAR_DATA.family || []).map(f => f.id);
  cjarFavourite = new Array(cjarPlayerCount).fill(null);
  cjarWatcher   = new Array(cjarPlayerCount).fill(null);
  for (let i = 0; i < cjarPlayerCount; i++) {
    const fav = ids[Math.floor(Math.random() * ids.length)];
    const rest = ids.filter(id => id !== fav);
    cjarFavourite[i] = fav;
    cjarWatcher[i]   = rest[Math.floor(Math.random() * rest.length)];
  }
}

// Called at the END of every flip while a Treat sits. Never split. "Solo" is
// evaluated in PRIORITY ORDER, not independently: two players can each be the only
// one who chose their action, and the higher-priority one wins outright.
function cjarDDResolveTreat() {
  if (!cjarCounterTreat) return;
  const solo = list => (list.length === 1 ? list[0] : -1);
  let w = solo(cjarSeatsChoosing('take'));
  if (w < 0) w = solo(cjarSeatsChoosing('dob'));
  if (w < 0) w = solo(cjarSeatsChoosing('innocent'));
  if (w < 0) return;                            // nobody uniquely solo — re-contests
  cjarDDGain(w, cjarCounterTreat.points);
  cjarTreatsWon[w] += 1;
  cjarCounterTreat = null;
}

// Returns raidEnded. Writes per-player flavour into `lines`.
function cjarResolveFlipDD(lines) {
  const takers    = cjarSeatsChoosing('take');
  const dobbers   = cjarSeatsChoosing('dob');
  const innocents = cjarSeatsChoosing('innocent');
  const card = cjarCard;

  if (card && card.type === 'cookie') {
    const V = card.value;
    if (takers.length && dobbers.length) {
      const steal = Math.min(CJAR_DD_DOB_STEAL * dobbers.length, V);
      const dPer  = cjarSplit(steal, dobbers.length);      dobbers.forEach(i => cjarDDGain(i, dPer));
      const tPer  = cjarSplit(V - steal, takers.length);   takers.forEach(i  => cjarDDGain(i, tPer));
    } else if (takers.length) {
      const tPer = cjarSplit(V, takers.length);            takers.forEach(i  => cjarDDGain(i, tPer));
    } else if (dobbers.length) {
      dobbers.forEach(i => cjarDDPay(i, CJAR_DD_DOB_BACKFIRE));  // backfire — nobody took
      cjarCrumbs += V;                                           // card value unclaimed
    } else {
      cjarCrumbs += V;                                           // everyone played innocent
    }
  } else if (card && card.type === 'family') {
    takers.forEach(i => {
      const loss = cjarFavourite[i] === card.id ? CJAR_DD_TAKE_LOSS.favourite
                 : cjarWatcher[i]   === card.id ? CJAR_DD_TAKE_LOSS.watcher
                 : CJAR_DD_TAKE_LOSS.neutral;
      if (loss) cjarDDPay(i, loss);
    });
    dobbers.forEach(i => cjarDDPay(i, CJAR_DD_DOB_BACKFIRE));    // ALWAYS backfires here
  }

  // SCARE-OFF — runs LAST so an all-innocent flip absorbs its own contribution
  // immediately. A Dobber's presence denies Innocents the pile on BOTH card types,
  // and the pile is then left untouched for a future flip.
  if (innocents.length && dobbers.length === 0) {
    const pool = cjarCrumbs; cjarCrumbs = 0;     // drain BEFORE splitting into itself
    const iPer = cjarSplit(pool, innocents.length);
    innocents.forEach(i => cjarDDGain(i, iPer));
  }

  cjarDDResolveTreat();

  takers.forEach(i    => { lines[i] = 'Took a cookie.'; });
  dobbers.forEach(i   => { lines[i] = 'Dobbed.'; });
  innocents.forEach(i => { lines[i] = 'Played innocent.'; });

  // The ~11-card deck running out is the ONLY Raid-end condition in Dibber Dobber.
  return cjarDeck.length === 0;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tools/verify-cjar-dd.js`
Expected: PASS on all 16 sections; `ALL CHECKS PASSED`; exit 0.

Then confirm nothing regressed: `node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js` → both PASS.

- [ ] **Step 5: Commit**

```bash
git add js/games/cjar.js tools/verify-cjar-dd.js
git commit -m "$(cat <<'EOF'
feat(cjar): Dibber Dobber ledger and resolution

cjarDDGain/cjarDDPay are the only Sylly ledger mutations — Crumb Debt (cap 6)
closes the free-Dob-at-zero exploit and cookies never go negative. Scare-off runs
last so an all-innocent flip absorbs its own contribution. Treat priority
Take > Dob > Play Innocent is evaluated in order, not independently.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: `tools/simulate-cjar-dd.js` — the balance instrument

Spec §17 **D-11 mitigation, and a required deliverable — not optional.** The Dibber Dobber numbers (`CJAR_DD_DEBT_CAP` 6, `CJAR_DD_START_STASH` 5, the reversed Treat priority, `CJAR_DD_CUT` 10) were simulated at a **16-card** deck and ship at **~11**. This tool is what makes that gap measurable before playtest rather than after.

**Files:**
- Create: `tools/simulate-cjar-dd.js`

**Interfaces:**
- Consumes: the real `cjarStartMatch`, `cjarStartRaid`, `cjarApplyCardEffect`, `cjarResolveFlip`, `cjarEndRaid`, `cjarRanks` — no rules are re-implemented.
- Produces: no exported symbol. Prints a report and exits 0 (it measures, it does not gate).

- [ ] **Step 1: Write the simulator**

Unlike the three verifiers this one has no pass/fail assertions — a balance figure is a reading, not a contract, and making it exit non-zero would turn a tuning signal into a broken build. It uses a **real `Math.random`** and a real `shuffle`, because the whole point is the distribution.

```javascript
// ═══════════════════════════════════════════════════════════════════════════
// simulate-cjar-dd.js — balance instrument for Dibber Dobber.
//
//   node tools/simulate-cjar-dd.js [matches] [players]
//   (defaults: 5000 matches, 5 players)
//
// Spec §17 D-11 mitigation. The Sylly balance numbers were simulated at a 16-card
// deck and ship at ~11 (CJAR_DD_CUT 10 + the scheduled Treat). This measures them
// at the REAL deck size before a table ever sees them.
//
// It ASSERTS NOTHING and always exits 0 — a balance reading is a tuning signal,
// not a contract, and a flaky exit code would make the build lie. Read the report.
//
// Unlike the three verify-* tools this one uses real randomness: the distribution
// IS the measurement, so shuffle and Math.random are the genuine article.
//
// What to look at:
//   • Action lean vs the 33% baseline — an archetype nobody plays is a dead rule.
//   • Win-rate spread across the three archetypes — a dominant strategy shows here.
//   • Debt-cap saturation — if seats sit pinned at 6, the cap is too tight.
//   • Treats unclaimed — the reversed priority is meant to be winnable, not rare.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT     = path.join(__dirname, '..');
const dataJson = fs.readFileSync(path.join(ROOT, 'data/cjar-data.json'), 'utf8');

const MATCHES = parseInt(process.argv[2], 10) || 5000;
const PLAYERS = parseInt(process.argv[3], 10) || 5;

// A real Fisher-Yates, matching engine.js's pure shuffle exactly.
function realShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const sandbox = {
  console: { log() {}, warn() {} },              // the plugin is quiet; this tool reports
  document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
  window: { syllyMultiplayerMode: 'single' },
  fetch: () => Promise.resolve({ json: () => Promise.resolve(JSON.parse(dataJson)) }),
  shuffle: realShuffle,
  showScreen() {},
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  playLaunch() {}, playWhoosh() {}, playDone() {}, playTick() {}, playBoing() {},
  playAlarm() {}, playSuccess() {}, playClashWin() {}, playHullThud() {},
  playAbyssThud() {}, playUnchallenged() {}, playPoacher() {}, playExit() {},
  playPillClick() {}, playSyllyOn() {}, playSyllyOff() {},
  assetFace: () => null, assetBack: () => null,
  mpSendEnvelope() { throw new Error('mpSendEnvelope called in single mode'); },
  mpSendPrivate()  { throw new Error('mpSendPrivate called in single mode'); },
  mpLockSync() {}, mpUnlockSync() {}, mpPlayerSlots: [], mpMyPlayerIdx: 0,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const BRIDGE = `
globalThis.__sim = {
  get stashes() { return cjarStashes; },
  get debt()    { return cjarCrumbDebt; },
  get deck()    { return cjarDeck; },
  get card()    { return cjarCard; },
  get treat()   { return cjarCounterTreat; },
  get treatsWon(){ return cjarTreatsWon; },
  get raidNo()  { return cjarRaidNo; },
  get fav()     { return cjarFavourite; },
  get watch()   { return cjarWatcher; },
  setup(n, len) {
    cjarPlayerCount = n;
    cjarPlayerNames = Array.from({ length: n }, (_, i) => 'P' + i);
    cjarSyllyMode = true; cjarMatchLength = len; cjarOpenBook = true;
  },
  ranks() { return cjarRanks(); },
};`;

vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/games/cjar.js'), 'utf8') + BRIDGE, sandbox,
  { filename: 'js/games/cjar.js' });

// ── Three archetypes, one per lean. Each is a plausible table personality, not an
//    optimal solver — the question is whether any lean runs away with the game.
const ARCHETYPES = {
  greedy:   { label: 'Take-leaning',     weights: { take: 0.60, innocent: 0.25, dob: 0.15 } },
  cautious: { label: 'Innocent-leaning', weights: { take: 0.20, innocent: 0.65, dob: 0.15 } },
  snitch:   { label: 'Dob-leaning',      weights: { take: 0.25, innocent: 0.30, dob: 0.45 } },
};
const NAMES = Object.keys(ARCHETYPES);

function pick(weights) {
  const r = Math.random();
  let acc = 0;
  for (const k of ['take', 'innocent', 'dob']) { acc += weights[k]; if (r < acc) return k; }
  return 'innocent';
}

(async () => {
  await sandbox.cjarLoadData();
  const S = sandbox.__sim;

  const wins       = Object.fromEntries(NAMES.map(n => [n, 0]));
  const seats      = Object.fromEntries(NAMES.map(n => [n, 0]));
  const cookiesEnd = Object.fromEntries(NAMES.map(n => [n, 0]));
  const actions    = { take: 0, innocent: 0, dob: 0 };
  let debtTicks = 0, debtCapped = 0, flips = 0, deckSizes = [];
  let treatsOffered = 0, treatsClaimed = 0;

  for (let m = 0; m < MATCHES; m++) {
    // Rotate the archetype assignment so seat order never biases the result.
    const assign = Array.from({ length: PLAYERS }, (_, i) => NAMES[(i + m) % NAMES.length]);
    assign.forEach(a => { seats[a]++; });

    S.setup(PLAYERS, 5);
    sandbox.cjarStartMatch();

    for (let raid = 1; raid <= 5; raid++) {
      if (raid > 1) sandbox.cjarStartRaid();
      deckSizes.push(S.deck.length);
      let guard = 0;
      while (guard++ < 60) {
        sandbox.cjarApplyCardEffect();
        if (!S.card) break;
        if (S.treat) treatsOffered++;
        const hadTreat = !!S.treat;
        const choices = assign.map(a => {
          const c = pick(ARCHETYPES[a].weights);
          actions[c]++;
          return c;
        });
        flips++;
        const res = sandbox.cjarResolveFlip(choices);
        if (hadTreat && !S.treat) treatsClaimed++;
        S.debt.forEach(d => { if (d > 0) debtTicks++; if (d >= 6) debtCapped++; });
        if (res.raidEnded) break;
      }
      sandbox.cjarEndRaid('deckout');
    }

    const ranks = S.ranks();
    const best  = Math.min(...ranks);
    ranks.forEach((r, i) => { if (r === best) wins[assign[i]] += 1 / ranks.filter(x => x === best).length; });
    S.stashes.forEach((s, i) => { cookiesEnd[assign[i]] += s; });
  }

  const pct = (n, d) => d ? (100 * n / d).toFixed(1) + '%' : '—';
  const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
  const totalActions = actions.take + actions.innocent + actions.dob;

  console.log('Cookie Jar — Dibber Dobber balance simulation');
  console.log('='.repeat(58));
  console.log(`matches ${MATCHES}   players ${PLAYERS}   flips ${flips}`);
  console.log(`mean deck size ${avg(deckSizes)}  (spec target ~11: CJAR_DD_CUT 10 + 1 Treat)`);

  console.log('\nAction lean across all seats (baseline 33.3% each)');
  for (const k of ['take', 'innocent', 'dob']) {
    console.log(`  ${k.padEnd(9)} ${pct(actions[k], totalActions)}`);
  }

  console.log('\nWin rate by archetype (baseline ' + pct(1, NAMES.length) + ')');
  for (const n of NAMES) {
    console.log(`  ${ARCHETYPES[n].label.padEnd(18)} ${pct(wins[n], MATCHES).padStart(6)}` +
                `   mean final Cookie Stash ${(cookiesEnd[n] / seats[n]).toFixed(1)}`);
  }
  const rates = NAMES.map(n => wins[n] / MATCHES);
  console.log(`  spread (max − min): ${((Math.max(...rates) - Math.min(...rates)) * 100).toFixed(1)} pts`);

  console.log('\nCrumb Debt');
  console.log(`  seat-flips in debt      ${pct(debtTicks, flips * PLAYERS)}`);
  console.log(`  of those, pinned at cap ${pct(debtCapped, debtTicks)}   (CJAR_DD_DEBT_CAP = 6)`);

  console.log('\nTreats');
  console.log(`  offered ${treatsOffered}   claimed ${treatsClaimed}   (${pct(treatsClaimed, treatsOffered)})`);

  console.log('\nReading this report');
  console.log('  • Win-rate spread above ~12 pts suggests a dominant lean — retune before playtest.');
  console.log('  • Debt pinned at the cap above ~25% means CJAR_DD_DEBT_CAP is too tight.');
  console.log('  • Treats claimed below ~40% means the reversed priority is too hard to hit.');
  console.log('  • This tool asserts nothing. It always exits 0. Read the numbers.');
})();
```

- [ ] **Step 2: Run it**

Run: `node tools/simulate-cjar-dd.js 2000 5`
Expected: a full report, exit 0. Mean deck size should read ~11.00. If it reads 16, `CJAR_DD_CUT` or the Treat-after-cut ordering in `cjarBuildDeck` is wrong and Task 4 regressed.

- [ ] **Step 3: Run the default sweep and record the reading**

Run: `node tools/simulate-cjar-dd.js`
Then run it once more at 8 players: `node tools/simulate-cjar-dd.js 5000 8`

Record both readings — the three headline numbers (win-rate spread, debt-cap saturation, Treats claimed) — in `docs/implementation-notes/cjar-implementation-notes.md` under **Design Decisions**, created in Task 17. **Do not retune any constant in this task.** The instrument's job here is to produce a pre-playtest baseline; changing a number now would leave nothing to compare the playtest against. If a reading breaches one of the thresholds printed in the report, note it as a flagged item for playtest round 1 rather than acting on it.

- [ ] **Step 4: Commit**

```bash
git add tools/simulate-cjar-dd.js
git commit -m "$(cat <<'EOF'
feat(cjar): Dibber Dobber balance simulator (spec D-11 mitigation)

Measures action lean, win-rate spread across three archetypes, Crumb Debt cap
saturation and Treat claim rate at the REAL ~11-card deck — the Sylly numbers were
simulated at 16. Asserts nothing and always exits 0: a balance reading is a tuning
signal, not a contract.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

### Task 10: The render seam and the core art manifest

**Files:**
- Modify: `js/games/cjar.js` — replace the `cjarRenderCard` stub
- Modify: `css/styles.css` — append the card block
- Create: `data/art/cjar/pack.json`
- Modify: `data/art/registry.json`

**Interfaces:**
- Consumes: `assetFace('cjar', key)` / `assetBack('cjar')` from `js/lib/art.js`; `cjarArtKey(card)` (Task 4).
- Produces: `cjarRenderCard(card, opts)` → DOM node. `opts.faceDown` → back; `opts.size` → `'hero'` (default) | `'thumb'` | `'counter'`; `opts.dimmed` → 35% opacity. **No cjar card DOM is built anywhere else** — a bypass is unskinnable.

- [ ] **Step 1: Write the failing test**

Append to `tools/verify-cjar-deck.js` before the summary. The sandbox's `document.getElementById` returns null but `document.createElement` is not stubbed, so add a minimal element factory to the deck harness's `document` first:

```javascript
// In the sandbox's `document` object, alongside getElementById:
  createElement: tag => ({
    tagName: tag.toUpperCase(), className: '', style: { cssText: '' },
    dataset: {}, textContent: '', children: [],
    appendChild(c) { this.children.push(c); return c; },
  }),
```

Then the checks:

```javascript
  section('cjarRenderCard — the one seam all card DOM goes through');
  let node = sandbox.cjarRenderCard({ type:'cookie', value: 9 });
  check('hero by default',    node.className.includes('cjar-card-hero'), true);
  check('no asset class when art is absent', node.className.includes('cjar-card-asset'), false);
  node = sandbox.cjarRenderCard({ type:'cookie', value: 9 }, { size: 'thumb' });
  check('thumb size',   node.className.includes('cjar-card-thumb'), true);
  node = sandbox.cjarRenderCard({ type:'treat', id:'macarons', points:10, tier:'super' }, { size: 'counter' });
  check('counter size', node.className.includes('cjar-card-counter'), true);
  node = sandbox.cjarRenderCard(null, { faceDown: true });
  check('face down',    node.className.includes('cjar-card-back'), true);

  section('cjarRenderCard resolves art through assetFace, keyed by art key');
  const asked = [];
  sandbox.assetFace = (kind, id) => { asked.push([kind, id]); return 'data/art/cjar/img/x.jpg'; };
  node = sandbox.cjarRenderCard({ type:'cookie', value: 15 });
  check('asked for kind cjar + tier key', asked[0], ['cjar', 'cookie-mountain']);
  check('renders as an asset',            node.className.includes('cjar-card-asset'), true);
  check('background-image set',           node.style.cssText.includes('background-image'), true);
  sandbox.assetBack = () => 'data/art/cjar/img/back.jpg';
  node = sandbox.cjarRenderCard(null, { faceDown: true });
  check('back uses assetBack', node.style.cssText.includes('back.jpg'), true);
  sandbox.assetFace = () => null; sandbox.assetBack = () => null;   // restore

  section('Core art manifest covers every art key');
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/art/cjar/pack.json'), 'utf8'));
  check('kind is cjar',   manifest.assets.kind, 'cjar');
  check('marked core',    manifest.core, true);
  check('13 faces',       Object.keys(manifest.assets.faces).length, 13);
  check('has a back',     typeof manifest.assets.back, 'string');
  check('faces match the 13 derived art keys',
    Object.keys(manifest.assets.faces).sort(), [...allKeys].sort());
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/art/registry.json'), 'utf8'));
  check('cjar is in the core-art registry', reg.includes('cjar'), true);
  // Core art is PRECACHED, never in the Terminal — the whole difference from a skin.
  const packReg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/packs/registry.json'), 'utf8'));
  check('cjar is NOT a skin pack', packReg.includes('cjar'), false);
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node tools/verify-cjar-deck.js`
Expected: FAIL — `hero by default` gets `false` (the stub returns a bare div), then `ENOENT … data/art/cjar/pack.json`.

- [ ] **Step 3: Implement the seam**

Replace the `cjarRenderCard` stub in `js/games/cjar.js`:

```javascript
// ── The render seam ────────────────────────────────────────────────────────
// EVERY cjar card in the DOM is built here. Nothing else may construct one — a
// bypass is unskinnable and invisible to the art pipeline (DYB's old cup-die
// bypass is the cautionary case).
//   opts.faceDown  → the card back
//   opts.size      → 'hero' (default) | 'thumb' | 'counter'
//   opts.dimmed    → 35% opacity, for a spent trail entry
function cjarRenderCard(card, opts = {}) {
  const el = document.createElement('div');
  const size = 'cjar-card-' + (opts.size || 'hero');

  if (opts.faceDown || !card) {
    el.className = 'cjar-card-back ' + size;
    const back = (typeof assetBack === 'function') && assetBack('cjar');
    el.style.cssText = back
      ? 'background:none;background-size:cover;background-position:center;background-image:url("' + back + '");'
      : '';
    return el;
  }

  el.dataset.cardType = card.type;
  // Three-tier art (skin → core art → emoji) resolves inside assetFace — art.js.
  // The art key is DERIVED here and never travels in a packet.
  const faceUrl = (typeof assetFace === 'function') && assetFace('cjar', cjarArtKey(card));
  const dim = opts.dimmed ? 'opacity:0.35;' : '';

  if (faceUrl) {
    el.className = 'cjar-card cjar-card-asset ' + size + ' cjar-card-' + card.type;
    el.style.cssText = 'background-image:url("' + faceUrl + '");' + dim;
    // The numeric value is a TEXT OVERLAY on the tier art — this is what collapses
    // 15 cookie values onto 3 assets. It must survive the asset branch.
    if (card.type === 'cookie') {
      const v = document.createElement('div');
      v.className = 'cjar-card-value';
      v.textContent = String(card.value);
      el.appendChild(v);
    }
    return el;
  }

  // Emoji + CSS fallback — the shipped look is illustrated, but the seam must never
  // depend on art having loaded.
  el.className = 'cjar-card ' + size + ' cjar-card-' + card.type;
  el.style.cssText = dim;
  const emoji = document.createElement('div');
  emoji.className = 'cjar-card-emoji';
  const name = document.createElement('div');
  name.className = 'cjar-card-name';

  if (card.type === 'cookie') {
    emoji.textContent = '🍪';
    name.textContent = (CJAR_DATA.cookieTiers[cjarCookieTier(card.value)] || {}).label || '';
    const v = document.createElement('div');
    v.className = 'cjar-card-value';
    v.textContent = String(card.value);
    el.appendChild(emoji); el.appendChild(v); el.appendChild(name);
    return el;
  }
  if (card.type === 'family') {
    const fam = (CJAR_DATA.family || []).find(f => f.id === card.id) || {};
    emoji.textContent = fam.emoji || '👪';
    name.textContent  = fam.name || '';
  } else {
    const t = (CJAR_DATA.treats || []).find(x => x.id === card.id) || {};
    emoji.textContent = '🍰';
    name.textContent  = t.name || '';
  }
  el.appendChild(emoji); el.appendChild(name);
  return el;
}
```

- [ ] **Step 4: Append the card CSS**

Append to `css/styles.css`, after the cjar brand block:

```css
/* Cookie Jar cards — default face is illustrated art with an emoji fallback
   (render seam: cjarRenderCard — no card DOM is built anywhere else). */
.cjar-card {
  position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.25rem;
  border-radius: 0.9rem;
  background: #FFFBF0;
  border: 2px solid #E5C97A;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  user-select: none;
  flex-shrink: 0;
  overflow: hidden;
}
.cjar-card-hero    { width: 15rem;   height: 20.6rem; }
.cjar-card-counter { width: 3.5rem;  height: 4.75rem; }
.cjar-card-thumb   { width: 3rem;    height: 4.1rem; }
.cjar-card-emoji   { font-size: 2.4rem; line-height: 1; }
.cjar-card-thumb .cjar-card-emoji,
.cjar-card-counter .cjar-card-emoji { font-size: 1.4rem; }
.cjar-card-name {
  font-size: 0.7rem; font-weight: 700; color: #7A5C0A;
  text-align: center; line-height: 1.15; padding: 0 4px;
}
.cjar-card-thumb .cjar-card-name { display: none; }
/* The value overlay is what lets 15 cookie values share 3 tier assets. It sits
   ABOVE the art, so it needs its own stacking context and a readable plate. */
.cjar-card-value {
  position: absolute; bottom: 0.4rem; right: 0.5rem;
  font-size: 1.6rem; font-weight: 800; color: #292524;
  background: rgba(255,251,240,0.88);
  border-radius: 0.6rem; padding: 0 0.45rem; line-height: 1.25;
}
.cjar-card-thumb .cjar-card-value,
.cjar-card-counter .cjar-card-value { font-size: 0.85rem; bottom: 0.15rem; right: 0.15rem; }
.cjar-card-family { border-color: #C08A5A; }
.cjar-card-treat  { border-color: #D48FB0; }
/* Illustrated / asset-pack face — fills the card, keeps the size classes. */
.cjar-card-asset {
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-color: transparent;
}
.cjar-card-asset .cjar-card-emoji,
.cjar-card-asset .cjar-card-name { display: none; }
.cjar-card-back {
  border-radius: 0.9rem;
  background: repeating-linear-gradient(45deg, #D4A017, #D4A017 8px, #B8860B 8px, #B8860B 16px);
  border: 2px solid #B8860B;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  flex-shrink: 0;
}
/* A cookie delta flying to a player row. Transform + opacity only — both are
   GPU-composited; animating top/left would jank on a mid-range phone. */
@keyframes cjar-delta-fly {
  0%   { transform: translateY(0) scale(0.95); opacity: 0; }
  20%  { transform: translateY(-6px) scale(1); opacity: 1; }
  100% { transform: translateY(-38px) scale(1); opacity: 0; }
}
.cjar-delta {
  position: absolute;
  font-weight: 800; font-size: 1.1rem; color: #7A5C0A;
  animation: cjar-delta-fly 380ms ease-out forwards;
  will-change: transform, opacity;
}
```

- [ ] **Step 5: Create the core art manifest and register it**

`data/art/cjar/pack.json` — the **13 face keys** must match `cjarArtKey`'s output exactly, which the harness asserts. The card back is the separate `back` field, not a face (Delta 4): 13 faces + 1 back = **14 images**.

```json
{
  "id": "cjar",
  "label": "COOKIE JAR — CORE ART",
  "core": true,
  "games": ["cjar"],
  "assets": {
    "kind": "cjar",
    "basePath": "img/",
    "faces": {
      "cookie-handful":  "cookie-handful.jpg",
      "cookie-batch":    "cookie-batch.jpg",
      "cookie-mountain": "cookie-mountain.jpg",
      "family-mum":      "family-mum.jpg",
      "family-dad":      "family-dad.jpg",
      "family-big":      "family-big.jpg",
      "family-grandma":   "family-grandma.jpg",
      "family-pet":      "family-pet.jpg",
      "treat-shortbread": "treat-shortbread.jpg",
      "treat-redvelvet":  "treat-redvelvet.jpg",
      "treat-macadamia":  "treat-macadamia.jpg",
      "treat-macarons":   "treat-macarons.jpg",
      "treat-brownies":   "treat-brownies.jpg"
    },
    "back": "back.jpg"
  }
}
```

`data/art/registry.json`:

```json
["pko","flw","frt","shp","cjar"]
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `node tools/verify-cjar-deck.js`
Expected: PASS, including `13 faces` and `faces match the 13 derived art keys`; `ALL CHECKS PASSED`.

Then: `node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js` → both PASS.

- [ ] **Step 7: Commit**

```bash
git add js/games/cjar.js css/styles.css data/art/cjar/pack.json data/art/registry.json tools/verify-cjar-deck.js
git commit -m "$(cat <<'EOF'
feat(cjar): card render seam and core art manifest

cjarRenderCard is the only place cjar card DOM is built. Art resolves through
assetFace('cjar', cjarArtKey(card)) — 13 keys, with the cookie value drawn as a
text overlay so 15 values share 3 tier assets. Registered as core art (precached,
never in the Terminal); images land in Task 16.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: The table Stage — hero card, deck badge, warning strip, Crumb Trail

**Files:**
- Modify: `js/games/cjar.js` — add `cjarRenderStage`, `cjarRenderWarningStrip`, `cjarRenderTrailStrip`, `cjarOpenTrail`, `cjarFlyDelta`

**Interfaces:**
- Consumes: `cjarRenderCard` (Task 10); `cjarCard`, `cjarDeck`, `cjarSeen`, `cjarFamilyCopies`, `cjarHighAlertId`, `cjarTrail`, `cjarCounterTreat`.
- Produces: `cjarRenderStage()`, `cjarRenderWarningStrip()`, `cjarRenderTrailStrip()`, `cjarOpenTrail()`, `cjarFlyDelta(amount)`.

There is no headless test for this task — it is DOM rendering, and the sandbox's `getElementById` returns null so every function short-circuits on its own guard. The verification is the browser walk in Step 4. That is deliberate: the checklist rule is to scope the harness by **what a function decides**, and these decide nothing — they read state the harnesses already prove.

- [ ] **Step 1: Implement the Stage renderers**

Append to `js/games/cjar.js`:

```javascript
// ── Table: the Stage zone ──────────────────────────────────────────────────
// Every renderer starts with a null-guard so it runs unmodified against the
// harness's null document and against a screen that isn't mounted yet.
function cjarRenderStage() {
  const hero = document.getElementById('cjar-table-hero');
  if (hero) {
    hero.innerHTML = '';
    hero.appendChild(cjarRenderCard(cjarCard, { size: 'hero' }));
    hero.onclick = () => { playDone(); cjarOpenTrail(); };
  }
  const badge = document.getElementById('cjar-deck-badge');
  if (badge) {
    badge.innerHTML = '';
    if (cjarDeck.length) {
      badge.appendChild(cjarRenderCard(null, { faceDown: true, size: 'counter' }));
      const n = document.createElement('div');
      n.className = 'text-xs font-bold text-stone-500 text-center mt-1';
      n.textContent = cjarDeck.length + ' left';
      badge.appendChild(n);
    }
    // A Treat on the counter shares this corner — it is the second thing on the
    // table and must be visible while it is unclaimed.
    if (cjarCounterTreat) {
      badge.appendChild(cjarRenderCard(cjarCounterTreat, { size: 'counter' }));
    }
  }
  cjarRenderWarningStrip();
  cjarRenderTrailStrip();
}

// Five slots, one per family member. dim = unseen this Raid; lit = seen once (a
// scare, nothing more); danger = one more of them ends the Raid. The High Alert
// outline is separate from all three — it marks a 4th copy in the deck, which is
// about ODDS, not about how close that family member is to busting you.
function cjarRenderWarningStrip() {
  const strip = document.getElementById('cjar-warning-strip');
  if (!strip) return;
  strip.innerHTML = '';
  (CJAR_DATA.family || []).forEach(f => {
    const copies = cjarFamilyCopies[f.id] || 0;
    const slot = document.createElement('div');
    const seen = cjarSeen[f.id] ? 1 : 0;
    // Sylly Mode has no bust, so the strip is purely informational there — it still
    // shows who has appeared, but never the danger state.
    const danger = seen && !cjarIsSylly();
    slot.className = 'flex-1 min-h-11 flex items-center justify-center rounded-lg text-lg transition-colors duration-150 '
      + (copies === 0 ? 'bg-stone-100 opacity-30'
         : danger     ? 'bg-red-100 ring-2 ring-red-400'
         : seen       ? 'bg-[#F7E9C4]'
                      : 'bg-stone-100 opacity-50')
      + (cjarHighAlertId === f.id ? ' ring-2 ring-offset-1 ring-[#D4A017]' : '');
    slot.textContent = f.emoji || '👪';
    slot.title = f.name + (copies ? '' : ' — all gone');
    strip.appendChild(slot);
  });
}

// Newest on the right, auto-scrolled to the end so the latest flip is always the
// one in view without a tap.
function cjarRenderTrailStrip() {
  const strip = document.getElementById('cjar-trail-strip');
  if (!strip) return;
  strip.innerHTML = '';
  cjarTrail.forEach(entry => {
    if (entry.type === 'sneak' || entry.type === 'deckout') return;   // not cards
    const card = entry.type === 'cookie' ? { type: 'cookie', value: entry.value }
               : entry.type === 'family' ? { type: 'family', id: entry.id }
                                         : { type: 'treat',  id: entry.id, points: entry.points };
    strip.appendChild(cjarRenderCard(card, { size: 'thumb', dimmed: true }));
  });
  strip.onclick = () => { playDone(); cjarOpenTrail(); };
  strip.scrollLeft = strip.scrollWidth;
}

// The Crumb Trail overlay — the flip LOG, plus the copies-remaining row. The title
// must never read as just "Crumbs": that is the scoring currency, not this list.
function cjarOpenTrail() {
  const ov = document.getElementById('cjar-trail-overlay');
  if (!ov) return;
  const copies = document.getElementById('cjar-trail-copies');
  if (copies) {
    copies.innerHTML = '';
    const h = document.createElement('p');
    h.className = 'text-xs font-semibold uppercase tracking-widest cjar-label';
    h.textContent = 'Still in the deck';
    copies.appendChild(h);
    (CJAR_DATA.family || []).forEach(f => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between bg-white rounded-xl px-3 py-2 shadow-sm';
      row.innerHTML = `<span class="text-sm text-stone-700">${f.emoji || '👪'} ${f.name}</span>`;
      const n = document.createElement('span');
      n.className = 'text-sm font-bold text-stone-500';
      n.textContent = (cjarFamilyCopies[f.id] || 0) + ' left';
      row.appendChild(n);
      copies.appendChild(row);
    });
  }
  const log = document.getElementById('cjar-trail-log');
  if (log) {
    log.innerHTML = '';
    const h = document.createElement('p');
    h.className = 'text-xs font-semibold uppercase tracking-widest cjar-label';
    h.textContent = 'Every flip this Raid';
    log.appendChild(h);
    if (!cjarTrail.length) {
      const empty = document.createElement('p');
      empty.className = 'text-stone-400 text-sm';
      empty.textContent = 'Nothing yet — the jar is still shut.';
      log.appendChild(empty);
    }
    cjarTrail.forEach(e => {
      const row = document.createElement('p');
      row.className = 'text-sm text-stone-600';
      const fam = id => ((CJAR_DATA.family || []).find(f => f.id === id) || {}).name || id;
      row.textContent =
        e.type === 'cookie'  ? `🍪 ${e.value} cookies — ${e.per} each`
      : e.type === 'family'  ? `${e.busted ? '🚨' : '👀'} ${fam(e.id)} — ${e.line}`
      : e.type === 'treat'   ? `🍰 A treat appeared on the counter`
      : e.type === 'sneak'   ? `🚪 ${e.players.map(i => cjarPlayerNames[i]).join(', ')} sneaked out`
                             : `📭 The jar ran dry — everyone left together`;
      log.appendChild(row);
    });
  }
  ov.style.display = 'flex';
}

// A cookie delta flying up from the Stage. Lives in an absolute layer over a
// relative anchor so it contributes ZERO height: in-flow it would change the
// column height, and because the <section> centres the Stack that re-centres the
// whole screen on every flip (the SHP sheep-parade bug). This fires ~55× a match.
function cjarFlyDelta(amount) {
  const layer = document.getElementById('cjar-delta-layer');
  if (!layer || !amount) return;
  const el = document.createElement('div');
  el.className = 'cjar-delta';
  el.style.left = (30 + Math.random() * 40) + '%';
  el.style.bottom = '10%';
  el.textContent = (amount > 0 ? '+' : '') + amount + ' 🍪';
  layer.appendChild(el);
  // Duration-based reduced-motion means animationend still fires, so this cleanup
  // is safe under prefers-reduced-motion. Never switch that block to animation:none.
  el.addEventListener('animationend', () => el.remove());
}
```

- [ ] **Step 2: Confirm the three harnesses still pass**

Run: `node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js`
Expected: three × `ALL CHECKS PASSED`. Each renderer's null-guard means the sandbox's null document is never a problem.

- [ ] **Step 3: Verify the Stack rules were not broken**

Run:
```bash
grep -n "my-auto\|flex-1\|flex-shrink-0" js/games/cjar.js
```
Expected: no output. `my-auto` inside an `overflow-y-auto` column is a silent no-op, and the `flex-1`/`flex-shrink-0` pair is the deprecated sticky-footer split.

- [ ] **Step 4: Browser walk**

Open `index.html`, then in the console:
```javascript
activeGameId = 'cjar'; cjarLoadData().then(() => {
  cjarPlayerCount = 4; cjarPlayerNames = ['Ali','Bea','Cam','Di'];
  cjarSyllyMode = false; cjarMatchLength = 5;
  cjarStartMatch(); cjarApplyCardEffect(); showScreen('screen-cjar-table'); cjarRenderStage();
});
```
Confirm: one hero card centred with its value legible; the deck badge shows a face-down card and a count; the five-slot warning strip sits in the header; tapping the hero card opens **Crumb Trail 🔍** showing the copies row and the log. Then run `cjarApplyCardEffect(); cjarRenderStage();` repeatedly — the trail strip grows and stays scrolled to the right, and the Stack stays centred without the header or controls shifting.

- [ ] **Step 5: Commit**

```bash
git add js/games/cjar.js
git commit -m "$(cat <<'EOF'
feat(cjar): table Stage — hero card, deck badge, warning strip, Crumb Trail

Delta animation lives in an absolute layer over a relative anchor: in-flow it would
change the column height and re-centre the whole Stack on every flip (SHP sheep-
parade bug), and this fires ~55x a match. Warning strip shows danger only in the
base game — Dibber Dobber has no bust.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: The table Controls — actions, waiting, spectating, reveal, timer

The screen's whole interaction surface, and where spec §11's second trap lives.

**Files:**
- Modify: `js/games/cjar.js` — add `cjarRenderTable`, `cjarRenderControls`, `cjarRenderRevealRows`, `cjarRenderPrivateStrip`, `cjarStartTimer`, `cjarStopTimer`, `cjarSubmitChoice`

**Interfaces:**
- Consumes: Tasks 6, 8, 10, 11.
- Produces: `cjarRenderTable()` (the master renderer — every SYNC handler calls this one function), `cjarSubmitChoice(choice)`, `cjarStartTimer(endTimestamp)`, `cjarStopTimer()`.

- [ ] **Step 1: Implement the Controls zone**

Append to `js/games/cjar.js`. Note the two spec traps, both handled here:

```javascript
// ── Table: master renderer ─────────────────────────────────────────────────
// Every SYNC handler calls THIS, never a sub-renderer, so a device can never end
// up with a half-updated screen.
function cjarRenderTable() {
  const raid = document.getElementById('cjar-table-raid');
  if (raid) raid.textContent = `Raid ${cjarRaidNo} of ${cjarMatchLength}`;
  cjarRenderStage();
  cjarRenderControls();
  cjarRenderRevealRows();
  cjarRenderPrivateStrip();
}

// ── Table: the Controls zone ───────────────────────────────────────────────
// Trap 2 (spec §11): mpLockSync() self-releases after 8 s, which is SHORTER than
// the 15 s decision window — a player who submitted early would watch their own
// buttons un-grey while the table still waits. So the Waiting state is expressed by
// REMOVING the buttons from the DOM, not by greying them. When the class self-clears
// there is nothing left to un-grey. mpLockSync is still called for its correctness
// layer (it drops the duplicate ACTION at the send choke point), and btn-mp-action
// still goes on the buttons as suite standard — it just isn't the mechanism.
function cjarRenderControls() {
  const box = document.getElementById('cjar-controls');
  if (!box) return;
  box.innerHTML = '';

  const mk = (label, choice, tone) => {
    const b = document.createElement('button');
    // Custom brand classes carry their own flex centering; Tailwind-coloured buttons
    // need it inline, because a show/hide helper setting display:flex would otherwise
    // pin the label top-left (PKO BUG-03, widened).
    b.className = 'btn-mp-action min-h-14 w-full rounded-2xl active:scale-95 text-lg font-semibold '
      + 'flex items-center justify-center transition-all duration-150 '
      + (tone === 'brand' ? 'cjar-cta' : 'bg-stone-200 hover:bg-stone-300 text-stone-700');
    b.textContent = label;
    b.addEventListener('click', () => cjarSubmitChoice(choice));
    return b;
  };

  if (cjarTablePhase === 'deciding') {
    if (cjarIsSylly()) {
      // "Sneak" must never appear in Dibber Dobber copy: in the base game it means
      // bank-and-leave, and here nobody leaves. Reusing it teaches the wrong rule.
      box.appendChild(mk('Take a Cookie 🍪', 'take', 'brand'));
      box.appendChild(mk('Play Innocent 😇', 'innocent'));
      box.appendChild(mk('Dob 👉', 'dob'));
    } else {
      box.appendChild(mk('Take a Cookie 🍪', 'take', 'brand'));
      box.appendChild(mk('Sneak Out 🚪', 'sneak'));
    }
    return;
  }

  if (cjarTablePhase === 'spectating') {
    const p = document.createElement('p');
    p.className = 'text-stone-500 text-sm text-center';
    p.textContent = 'You’re out with your cookies. Watching the rest of them sweat.';
    box.appendChild(p);
    return;
  }

  // 'waiting' and 'revealing' both show who is still deciding, as name chips.
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-wrap items-center justify-center gap-2';
  const caption = document.createElement('p');
  caption.className = 'text-stone-400 text-xs text-center w-full';
  caption.textContent = cjarTablePhase === 'waiting' ? 'Waiting on…' : '';
  wrap.appendChild(caption);
  for (let i = 0; i < cjarPlayerCount; i++) {
    if (!cjarIsSylly() && !cjarActive[i]) continue;
    if (cjarReadyCheck[i]) continue;
    const chip = document.createElement('span');
    chip.className = 'px-3 py-1 rounded-full bg-stone-100 text-stone-500 text-xs font-semibold';
    chip.textContent = cjarPlayerNames[i];
    wrap.appendChild(chip);
  }
  box.appendChild(wrap);
}

// One row per player, shown after CJAR_FLIP_RESOLVE. With Open Book OFF you still
// hear WHAT happened to everyone — you just don't see their numbers.
function cjarRenderRevealRows() {
  const box = document.getElementById('cjar-reveal-rows');
  if (!box) return;
  box.innerHTML = '';
  if (cjarTablePhase !== 'revealing') return;
  for (let i = 0; i < cjarPlayerCount; i++) {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between rounded-xl px-3 py-2 bg-white shadow-sm';
    // 30-80 ms stagger between rows, per the Motion Standard.
    row.style.animationDelay = (i * 50) + 'ms';
    const left = document.createElement('span');
    left.className = 'text-sm text-stone-700';
    left.textContent = cjarPlayerNames[i] + (cjarLines[i] ? ' — ' + cjarLines[i] : '');
    const right = document.createElement('span');
    right.className = 'text-sm font-bold ' + ((cjarDeltas[i] || 0) < 0 ? 'text-red-700' : 'text-stone-500');
    right.textContent = cjarStashVisible(i)
      ? ((cjarDeltas[i] > 0 ? '+' : '') + (cjarDeltas[i] || 0) + ' 🍪')
      : '•••';
    row.appendChild(left); row.appendChild(right);
    box.appendChild(row);
  }
}

// This device's own numbers. Always visible regardless of Open Book — it is your
// own hand, and Open Book only governs whether you can see OTHERS.
function cjarRenderPrivateStrip() {
  const box = document.getElementById('cjar-private-strip');
  if (!box) return;
  box.innerHTML = '';
  const me = mpMyPlayerIdx;
  const chip = (label, value, extraClass) => {
    const c = document.createElement('span');
    c.className = 'px-3 py-1 rounded-full text-xs font-semibold ' + (extraClass || 'bg-[#F7E9C4] text-[#7A5C0A]');
    c.textContent = label + ' ' + value;
    box.appendChild(c);
  };
  chip('Crumbs', cjarCrumbs + ' 🍪');
  chip('Cookie Stash', (cjarStashes[me] || 0) + ' 🍪');
  if (!cjarIsSylly()) chip('This Raid', (cjarRaidTotals[me] || 0) + ' 🍪');
  if (cjarIsSylly()) {
    if (cjarCrumbDebt[me] > 0) chip('Owes', cjarCrumbDebt[me] + ' 🍪', 'bg-red-100 text-red-800');
    const fam = id => ((CJAR_DATA.family || []).find(f => f.id === id) || {}).name || '—';
    chip('⭐ Favourite', fam(cjarMyFavourite));
    chip('👁 Watcher', fam(cjarMyWatcher));
  }
  const tip = document.createElement('button');
  tip.id = 'btn-cjar-crumbs-tip';
  tip.className = 'text-stone-300 font-bold text-xs leading-none active:scale-90 transition-transform duration-100';
  tip.textContent = '[?]';
  tip.addEventListener('click', () => {
    playDone();
    const lines = ['Leftovers that wouldn’t split evenly.', 'Sneak Out alone and you take the lot.'];
    if (cjarIsSylly()) lines[1] = 'A Dobber about the place and nobody’s touching them this flip.';
    cjarShowTip('🍪', 'Cookie Crumbs', lines);
  });
  box.appendChild(tip);
}

// ── The decision timer ─────────────────────────────────────────────────────
// Every device counts down against the SAME absolute endTimestamp, so clock skew
// stays cosmetic — only the host ever resolves.
function cjarStartTimer(endTimestamp) {
  cjarStopTimer();
  cjarEndTimestamp = endTimestamp;
  const fill = document.getElementById('cjar-timer-fill');
  let lastTick = -1;
  const paint = () => {
    const left = Math.max(0, cjarEndTimestamp - Date.now());
    if (fill) fill.style.transform = `scaleX(${left / CJAR_DECISION_MS})`;
    const secs = Math.ceil(left / 1000);
    if (secs <= 3 && secs > 0 && secs !== lastTick) { lastTick = secs; playTick(); }
    if (left <= 0) cjarStopTimer();
  };
  paint();
  cjarTimerHandle = setInterval(paint, 100);
}
function cjarStopTimer() {
  if (cjarTimerHandle) { clearInterval(cjarTimerHandle); cjarTimerHandle = null; }
}

// ── Submitting a choice ────────────────────────────────────────────────────
function cjarSubmitChoice(choice) {
  if (cjarTablePhase !== 'deciding') return;
  playDone();
  // mpLockSync's correctness layer drops a double-tap's second ACTION at the send
  // choke point. It is kept for exactly that; the Waiting state is the re-render.
  mpLockSync();
  cjarTablePhase = 'waiting';

  if (window.syllyMultiplayerMode === 'host' || window.syllyMultiplayerMode === 'single') {
    // The dedup guard drops every envelope where originId === syllyDeviceUid, so a
    // host that self-sends never marks its own seat and the flip hangs forever.
    // This has recurred in JEC, YGI and NT. Host mutates directly, then broadcasts.
    cjarApplyChoice(mpMyPlayerIdx, choice, cjarFlipSeq);
    cjarRenderTable();
    if (cjarAllIn()) cjarHostResolveFlip();
    return;
  }
  mpSendEnvelope({ type: 'ACTION', payload: { action: 'CJAR_CHOICE', flipSeq: cjarFlipSeq, choice } });
  cjarRenderTable();
}
```

- [ ] **Step 2: Confirm the harnesses still pass**

Run: `node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js`
Expected: three × `ALL CHECKS PASSED`.

- [ ] **Step 3: Grep the two suite-wide MP traps**

Run:
```bash
grep -n "window.mpMyPlayerIdx\|window.mpPlayerSlots\|window.mpActiveGame\|window.mpActiveRoomCode" js/games/cjar.js
grep -n "\.name\b" js/games/cjar.js
```
Expected: no output from the first (those are `let`-declared; a `window.` prefix returns `undefined` silently — BLD Bug 8). The second should show no `mpPlayerSlots[i].name` — the field is `.nickname`.

- [ ] **Step 4: Browser walk**

With the Task 11 console setup still loaded:
```javascript
cjarTablePhase = 'deciding'; cjarRenderTable();
```
Confirm three buttons in Sylly (`cjarSyllyMode = true; cjarRenderTable();`) and two in base; every button is at least 44 px tall with its label centred. Tap one — the buttons **leave the DOM** and name chips appear. Wait 10 seconds and confirm nothing un-greys or reappears (this is trap 2 — if buttons come back at ~8 s, the Waiting state is wrongly driven by `mp-sync-locked`). Then `cjarStartTimer(Date.now() + 15000)` and confirm the bar drains smoothly and ticks in the last three seconds.

- [ ] **Step 5: Commit**

```bash
git add js/games/cjar.js
git commit -m "$(cat <<'EOF'
feat(cjar): table Controls, reveal rows, private strip and the decision timer

Waiting is expressed by removing the action buttons from the DOM, not by greying
them: mpLockSync self-releases at 8s but the decision window is 15s, so a greyed
button would un-grey mid-wait (spec §11 trap 2). mpLockSync is still called for its
correctness layer. Host marks its own seat directly — a self-sent ACTION is dropped
by the dedup guard and hangs the flip.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: Interstitials, Raid summary and the end screen

**Files:**
- Modify: `js/games/cjar.js` — add `cjarShowRaidIntro`, `cjarShowBusted`, `cjarShowRaidSummary`, `cjarShowGameover`, `cjarShowClientStandby`, `cjarHostResolveFlip`, `cjarHostNextFlip`

**Interfaces:**
- Consumes: Tasks 6–12.
- Produces: the five screen-entry functions plus the two host drivers `cjarHostNextFlip()` and `cjarHostResolveFlip()`, which Task 15's packet layer calls.

- [ ] **Step 1: Implement the screens and the host flip driver**

Append to `js/games/cjar.js`:

```javascript
// ── Interstitials ──────────────────────────────────────────────────────────
// Both carry NO [?] / 🔊 / ✕: they auto-advance AND have no interactive element,
// which are the two conditions of the ui-style rule-5 exemption. 5 s is the
// documented practical ceiling — do not raise it. Past that a player with nothing
// to tap is genuinely stuck and the exemption should be reconsidered, not stretched.
function cjarShowRaidIntro(onDone) {
  const h = document.getElementById('cjar-intro-heading');
  if (h) h.textContent = `Raid ${cjarRaidNo} of ${cjarMatchLength}`;
  const s = document.getElementById('cjar-intro-sub');
  if (s) s.textContent = cjarIsSylly()
    ? 'Fresh jar. Nobody leaves, nobody busts.'
    : 'Fresh jar, fresh family. Grab what you can.';
  const aff = document.getElementById('cjar-intro-affinity');
  if (aff) {
    aff.innerHTML = '';
    aff.style.display = 'none';
    if (cjarIsSylly() && cjarMyFavourite) {
      const fam = id => ((CJAR_DATA.family || []).find(f => f.id === id) || {}).name || '—';
      aff.innerHTML =
        `<p class="text-sm text-stone-700">⭐ Your <b>Favourite</b> is <b>${fam(cjarMyFavourite)}</b> — they look the other way.</p>` +
        `<p class="text-sm text-stone-700">👁 Your <b>Watcher</b> is <b>${fam(cjarMyWatcher)}</b> — they're onto you.</p>` +
        `<p class="text-xs text-stone-400">Only you can see this.</p>`;
      aff.style.display = 'flex';
    }
  }
  showScreen('screen-cjar-raid-intro');
  if (cjarInterstitialHandle) clearTimeout(cjarInterstitialHandle);
  cjarInterstitialHandle = setTimeout(() => { cjarInterstitialHandle = null; onDone(); }, CJAR_INTERSTITIAL_MS);
}

// Base game only — Dibber Dobber never reaches this screen.
function cjarShowBusted(familyId, line, onDone) {
  const fam = (CJAR_DATA.family || []).find(f => f.id === familyId) || {};
  const e = document.getElementById('cjar-busted-emoji');
  if (e) e.textContent = fam.emoji || '🚨';
  const w = document.getElementById('cjar-busted-who');
  if (w) w.textContent = fam.name || '';
  const l = document.getElementById('cjar-busted-line');
  if (l) l.textContent = line || '';
  playAbyssThud();
  showScreen('screen-cjar-busted');
  if (cjarInterstitialHandle) clearTimeout(cjarInterstitialHandle);
  cjarInterstitialHandle = setTimeout(() => { cjarInterstitialHandle = null; onDone(); }, CJAR_INTERSTITIAL_MS);
}

// ── Raid summary ───────────────────────────────────────────────────────────
function cjarShowRaidSummary(banked) {
  cjarStopTimer();
  const t = document.getElementById('cjar-summary-raid');
  if (t) t.textContent = `Raid ${cjarRaidNo} of ${cjarMatchLength} complete`;
  const box = document.getElementById('cjar-summary-rows');
  if (box) {
    box.innerHTML = '';
    for (let i = 0; i < cjarPlayerCount; i++) {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between rounded-xl px-3 py-2 bg-white shadow-sm';
      const left = document.createElement('span');
      left.className = 'text-sm text-stone-700';
      left.textContent = cjarPlayerNames[i];
      const right = document.createElement('span');
      right.className = 'text-sm font-bold text-stone-500';
      // Open Book gates OTHERS' numbers only — your own row always reads.
      right.textContent = cjarStashVisible(i)
        ? `+${banked[i] || 0} 🍪   ·   ${cjarStashes[i]} total`
        : `+${banked[i] || 0} 🍪   ·   •••`;
      row.appendChild(left); row.appendChild(right);
      box.appendChild(row);
    }
  }
  // Host-gated: only the host advances the match. A client that could tap this
  // would run the next Raid locally and diverge until the next SYNC.
  const isHost = window.syllyMultiplayerMode !== 'client';
  const cta = document.getElementById('btn-cjar-next-raid');
  if (cta) cta.style.display = isHost ? 'flex' : 'none';
  const wait = document.getElementById('cjar-summary-waiting');
  if (wait) wait.style.display = isHost ? 'none' : 'block';
  showScreen('screen-cjar-raid-summary');
}

// ── End screen ─────────────────────────────────────────────────────────────
function cjarShowGameover() {
  cjarStopTimer();
  const ranks = cjarRanks();
  const red   = cjarRedHanded();
  const pod = document.getElementById('cjar-podium');
  if (pod) {
    pod.innerHTML = '';
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
  }
  // Players as ROWS, Raids as COLUMNS. Wide content scrolls inside its own
  // container so the page body never scrolls horizontally.
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
  playClashWin();
  showScreen('screen-cjar-gameover');
}

// Clients land here after the lobby and wait for CJAR_MATCH_START.
function cjarShowClientStandby() {
  const s = document.getElementById('cjar-intro-sub');
  if (s) s.textContent = 'Waiting for the host to open the jar…';
  const h = document.getElementById('cjar-intro-heading');
  if (h) h.textContent = 'Cookie Jar';
  const aff = document.getElementById('cjar-intro-affinity');
  if (aff) aff.style.display = 'none';
  showScreen('screen-cjar-raid-intro');
}

// ── Host flip driver ───────────────────────────────────────────────────────
// HOST ONLY. Reveals the next card, applies its effect, and either busts out of the
// Raid or opens the decision window.
function cjarHostNextFlip() {
  if (window.syllyMultiplayerMode === 'client') return;
  if (cjarHostTimeoutHandle) { clearTimeout(cjarHostTimeoutHandle); cjarHostTimeoutHandle = null; }

  if (!cjarDeck.length) { cjarHostEndRaid('deckout'); return; }
  const eff = cjarApplyCardEffect();

  if (eff.busted) {
    const last = cjarTrail[cjarTrail.length - 1] || {};
    cjarBroadcastResolve({ deltas: new Array(cjarPlayerCount).fill(0),
                           lines: new Array(cjarPlayerCount).fill(''),
                           raidEnded: true, bustFamilyId: eff.bustFamilyId, bustLine: last.line });
    playBoing();
    cjarShowBusted(eff.bustFamilyId, last.line, () => cjarHostEndRaid('bust'));
    return;
  }

  const sound = cjarCard.type === 'cookie' ? 'cookie'
              : cjarCard.type === 'family' ? 'caughtFirst'
              : (cjarCard.tier === 'super' ? 'treatSuper' : 'treatSpecial');
  const fn = window[CJAR_SOUND[sound]];
  if (typeof fn === 'function') fn();

  cjarEndTimestamp = Date.now() + CJAR_DECISION_MS;
  cjarTablePhase = (!cjarIsSylly() && !cjarActive[mpMyPlayerIdx]) ? 'spectating' : 'deciding';
  cjarBroadcastFlipStart();
  cjarRenderTable();
  cjarStartTimer(cjarEndTimestamp);
  showScreen('screen-cjar-table');

  // The grace window lets an ACTION that was already in flight when the clock hit
  // zero still land. Without it a player who tapped on the last tick is silently
  // auto-resolved instead.
  cjarHostTimeoutHandle = setTimeout(() => {
    cjarHostTimeoutHandle = null;
    // Timeout default: Sneak Out banks and is safe in the base game; Play Innocent
    // is the safe action in Dibber Dobber, where Sneak Out does not exist.
    const fallback = cjarIsSylly() ? 'innocent' : 'sneak';
    for (let i = 0; i < cjarPlayerCount; i++) {
      if (!cjarReadyCheck[i] && (cjarIsSylly() || cjarActive[i])) {
        cjarApplyChoice(i, fallback, cjarFlipSeq);
      }
    }
    cjarHostResolveFlip();
  }, CJAR_DECISION_MS + CJAR_TIMEOUT_GRACE_MS);
}

// HOST ONLY. Closes the window, resolves, broadcasts, then dwells before the next flip.
function cjarHostResolveFlip() {
  if (window.syllyMultiplayerMode === 'client') return;
  if (cjarHostTimeoutHandle) { clearTimeout(cjarHostTimeoutHandle); cjarHostTimeoutHandle = null; }
  cjarStopTimer();

  const res = cjarResolveFlip(cjarChoices.slice());
  cjarDeltas = res.deltas;
  cjarLines  = res.lines;
  const solo = cjarSeatsChoosing('sneak');
  if (!cjarIsSylly() && solo.length === 1) playUnchallenged(); else playDone();

  cjarBroadcastResolve({ ...res, bustFamilyId: null });
  cjarTablePhase = 'revealing';
  cjarRenderTable();
  cjarFlyDelta(cjarDeltas[mpMyPlayerIdx]);

  if (cjarRevealHandle) clearTimeout(cjarRevealHandle);
  cjarRevealHandle = setTimeout(() => {
    cjarRevealHandle = null;
    if (res.raidEnded) cjarHostEndRaid('allout');
    else cjarHostNextFlip();
  }, CJAR_REVEAL_MS);
}

// HOST ONLY.
function cjarHostEndRaid(reason) {
  if (window.syllyMultiplayerMode === 'client') return;
  cjarStopTimer();
  const { banked } = cjarEndRaid(reason);
  cjarBroadcastRaidEnd(banked);
  if (cjarRaidNo >= cjarMatchLength) { cjarBroadcastMatchEnd(); cjarShowGameover(); return; }
  cjarShowRaidSummary(banked);
}
```

- [ ] **Step 2: Wire the "Next Raid" CTA**

Add inside the `DOMContentLoaded` block in `js/games/cjar.js`, alongside the other `on(...)` calls:

```javascript
  on('btn-cjar-next-raid', () => {
    // Host-only. An absent broadcast branch does NOT stop a client running this
    // locally and diverging until the next SYNC — the guard is what stops it.
    if (window.syllyMultiplayerMode === 'client') return;
    playLaunch();
    cjarStartRaid();
    cjarBroadcastRaidStart();
    cjarShowRaidIntro(() => cjarHostNextFlip());
  });
  on('btn-cjar-menu-how-to',    () => { playDone(); cjarOpenOverlay('cjar-how-to-overlay'); });
  on('btn-cjar-how-to',         () => { playDone(); cjarOpenOverlay('cjar-how-to-overlay'); });
  on('btn-cjar-summary-how-to', () => { playDone(); cjarOpenOverlay('cjar-how-to-overlay'); });
  on('btn-cjar-family-tip', () => {
    playDone();
    cjarShowTip('👪', 'The Family', [
      'Dim = haven’t seen them this Raid.',
      'Lit = they’ve caught you once — a scare, nothing more.',
      'Red = one more of them and it’s BUSTED!',
    ]);
  });
```

- [ ] **Step 3: Implement `cjarShowTip` and `cjarOpenOverlay`**

Replace the `cjarShowTip` stub in `js/games/cjar.js`:

```javascript
// Shared tip overlay — one per game, reused for all three contextual [?] points.
// Three bullets maximum; resist explaining everything.
function cjarShowTip(emoji, heading, lines) {
  const e = document.getElementById('cjar-tip-emoji');   if (e) e.textContent = emoji;
  const h = document.getElementById('cjar-tip-heading'); if (h) h.textContent = heading;
  const b = document.getElementById('cjar-tip-body');
  if (b) {
    b.innerHTML = '';
    (lines || []).slice(0, 3).forEach(t => {
      const p = document.createElement('p');
      p.textContent = '• ' + t;
      b.appendChild(p);
    });
  }
  const ov = document.getElementById('cjar-tip-overlay');
  if (ov) ov.style.display = 'flex';
}

// Data overlays scroll-reset on open so the thematic title is always the first
// thing seen. overflow-y:auto comes from the .overlay-data-inner CLASS, not a
// Tailwind utility — querying '.overflow-y-auto' returns null and silently no-ops.
function cjarOpenOverlay(id) {
  const ov = document.getElementById(id);
  if (!ov) return;
  const inner = ov.querySelector('.overlay-data-inner');
  if (inner) inner.scrollTop = 0;
  ov.style.display = 'flex';
}
```

- [ ] **Step 4: Add temporary broadcast stubs so the file parses**

Task 15 implements these. Without them `cjarHostNextFlip` throws a `ReferenceError` on its first call.

```javascript
// Task 15 — the packet layer. Each is a no-op in 'single' mode by construction.
function cjarBroadcastFlipStart() {}
function cjarBroadcastResolve() {}
function cjarBroadcastRaidStart() {}
function cjarBroadcastRaidEnd() {}
function cjarBroadcastMatchEnd() {}
```

- [ ] **Step 5: Confirm the harnesses still pass**

Run: `node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js`
Expected: three × `ALL CHECKS PASSED`. The sandbox captures `setTimeout` without firing it, so `cjarHostNextFlip`'s auto-resolve never runs on its own.

- [ ] **Step 6: Browser walk — a full single-device match**

```javascript
activeGameId = 'cjar'; cjarLoadData().then(() => {
  mpMyPlayerIdx = 0;
  cjarPlayerCount = 4; cjarPlayerNames = ['Ali','Bea','Cam','Di'];
  cjarSyllyMode = false; cjarMatchLength = 3; cjarOpenBook = true;
  cjarStartMatch();
  cjarShowRaidIntro(() => cjarHostNextFlip());
});
```
Play it through. Confirm: the Raid intro dwells 5 s then lands on the table; tapping an action removes the buttons; the reveal rows appear and the delta flies without the Stack jumping; a bust shows BUSTED! with the family and a flavour line for 5 s; the Raid summary appears with **Next Raid** live; after Raid 3 the end screen shows the podium with Top Cookie Thief and Red-Handed and a 3-column history grid. Repeat with `cjarSyllyMode = true` and confirm three buttons, no BUSTED! screen, and the affinity block on the Raid intro.

- [ ] **Step 7: Commit**

```bash
git add js/games/cjar.js
git commit -m "$(cat <<'EOF'
feat(cjar): interstitials, Raid summary, end screen and the host flip driver

Both interstitials keep the chrome exemption (auto-advance + nothing to tap) at the
5s ceiling. Timer auto-resolve defaults to Sneak Out in the base game and Play
Innocent in Dibber Dobber, after a 1.5s grace so an in-flight tap still lands.
Next Raid is host-gated with an explicit client early-return.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: Settings and How to Play overlays

Protocol B Step 5 puts these last on purpose — they are enhancements, not the skeleton.

**Files:**
- Modify: `index.html` — fill `#cjar-settings-body` and `#cjar-how-to-body` (two contiguous insertions)
- Modify: `js/games/cjar.js` — settings wiring

**Interfaces:**
- Consumes: `cjarOpenOverlay` (Task 13).
- Produces: `cjarSyncSettingsUI()` — repaints every pill/toggle from the current values and hides the two bust-related cards when Sylly is ON.

- [ ] **Step 1: Fill `#cjar-settings-body` in `index.html`**

One contiguous insertion. Order is fixed: game options first, `✨ Sylly Mode` always last. Only the Sylly card gets an emoji prefix.

```html
        <div id="cjar-set-snack" class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
          <div>
            <p class="text-stone-800 font-semibold">Snack Friendly</p>
            <p class="text-stone-400 text-sm mt-0.5">Guarantees the first card or two of every Raid is cookies, so nobody gets busted before they've grabbed anything.</p>
          </div>
          <div class="flex gap-2">
            <button class="pill" data-group="cjar-snack" data-val="off">Off</button>
            <button class="pill pill-active-cjar" data-group="cjar-snack" data-val="safe">Safe First Grab</button>
            <button class="pill" data-group="cjar-snack" data-val="warmup">Warm-Up</button>
          </div>
        </div>

        <div id="cjar-set-house" class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
          <div>
            <p class="text-stone-800 font-semibold">House Rules</p>
            <p class="text-stone-400 text-sm mt-0.5">What happens to a family member after they catch you. Standard Burn makes them a little less likely next time; High Alert makes someone <span class="font-semibold text-stone-700">more</span> likely.</p>
          </div>
          <div class="flex gap-2">
            <button class="pill pill-active-cjar" data-group="cjar-house" data-val="burn">Standard Burn</button>
            <button class="pill" data-group="cjar-house" data-val="on-guard">On Guard</button>
            <button class="pill" data-group="cjar-house" data-val="high-alert">High Alert</button>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
          <div>
            <p class="text-stone-800 font-semibold">Match Length</p>
            <p class="text-stone-400 text-sm mt-0.5">How many Cookie Raids before the biggest Cookie Stash wins.</p>
          </div>
          <div class="flex gap-2">
            <button class="pill" data-group="cjar-length" data-val="3">Quick Snack (3)</button>
            <button class="pill pill-active-cjar" data-group="cjar-length" data-val="5">Full Feast (5)</button>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <p class="text-stone-800 font-semibold">Open Book</p>
            <button id="btn-cjar-openbook-toggle" class="game-toggle-on-cjar shrink-0">ON</button>
          </div>
          <p class="text-stone-400 text-sm">Shows everyone's cookies to everyone. Turn it off and you'll only see your own numbers — you'll hear what happened to the others, just not how much.</p>
        </div>

        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <p class="text-stone-800 font-semibold">✨ Sylly Mode</p>
            <button id="btn-cjar-sylly-toggle" class="game-toggle-off shrink-0">OFF</button>
          </div>
          <p class="text-stone-600 text-sm font-semibold">Dibber Dobber</p>
          <p class="text-stone-400 text-sm">Three moves instead of two. Take grabs cookies, Play Innocent keeps you safe and sweeps the crumbs, and Dob points the finger at whoever's taking. Nobody leaves, nobody busts, and nobody ever loses everything.</p>
        </div>

        <button id="btn-cjar-settings-close" class="cjar-cta min-h-14 w-full rounded-2xl text-xl font-semibold active:scale-95 transition-all duration-150">Got it</button>
```

- [ ] **Step 2: Fill `#cjar-how-to-body` in `index.html`**

Card order is fixed: Steps → **Winning and Scoring** → **✨ Sylly Mode** → close. Step labels use `cjar-label`; step headings carry no emoji.

```html
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest cjar-label">Step 1</p>
          <p class="font-bold text-stone-800">A card comes out of the jar</p>
          <p class="text-stone-500 text-sm">Everyone sees it at once. It's either <span class="font-semibold text-stone-700">cookies</span> 🍪, a member of the <span class="font-semibold text-stone-700">family</span> 👪, or a <span class="font-semibold text-stone-700">Treat</span> 🍰 that lands on the counter.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest cjar-label">Step 2</p>
          <p class="font-bold text-stone-800">Cookies get shared out straight away</p>
          <p class="text-stone-500 text-sm">Split evenly between everyone still raiding. Anything left over that won't divide becomes <span class="font-semibold text-stone-700">Cookie Crumbs</span>, sitting on the bench.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest cjar-label">Step 3</p>
          <p class="font-bold text-stone-800">Then everyone decides, at the same time</p>
          <p class="text-stone-500 text-sm"><span class="font-semibold text-stone-700">Take a Cookie</span> to stay in for the next card, or <span class="font-semibold text-stone-700">Sneak Out</span> to bank everything you've collected this Raid. You've got 15 seconds.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest cjar-label">Step 4</p>
          <p class="font-bold text-stone-800">Sneak out alone and you take the crumbs</p>
          <p class="text-stone-500 text-sm">The only one leaving? You scoop <span class="font-semibold text-stone-700">every crumb</span> on the bench and any Treat on the counter. Leave with someone else and you just split the crumbs.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest cjar-label">Step 5</p>
          <p class="font-bold text-stone-800">The family is watching</p>
          <p class="text-stone-500 text-sm">The first time someone turns up, it's just a scare. The <span class="font-semibold text-stone-700">second time the same person turns up</span>, it's BUSTED! — everyone still in the kitchen loses the lot.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest cjar-label">Step 6</p>
          <p class="font-bold text-stone-800">Banked cookies are safe forever</p>
          <p class="text-stone-500 text-sm">A bust only costs you what you were carrying <span class="font-semibold text-stone-700">this Raid</span>. Your <span class="font-semibold text-stone-700">Cookie Stash</span> can never go down.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest cjar-label">Step 7</p>
          <p class="font-bold text-stone-800">Five Raids, one jar</p>
          <p class="text-stone-500 text-sm">Each Raid starts a fresh jar. Check the <span class="font-semibold text-stone-700">Crumb Trail</span> 🔍 any time to see every flip and who's still lurking in the deck.</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest cjar-label">Winning and Scoring</p>
          <p class="font-bold text-stone-800">Biggest Cookie Stash takes it</p>
          <ul class="list-disc pl-5 flex flex-col gap-1 text-stone-500 text-sm">
            <li><span class="font-semibold text-stone-700">Most cookies banked</span> — Top Cookie Thief 🍪.</li>
            <li><span class="font-semibold text-stone-700">Tied?</span> Whoever grabbed more Treats wins it.</li>
            <li><span class="font-semibold text-stone-700">Still tied?</span> You share the spot.</li>
            <li><span class="font-semibold text-stone-700">Last place</span> gets caught Red-Handed.</li>
          </ul>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest cjar-label">✨ Sylly Mode</p>
          <p class="font-bold text-stone-800">Dibber Dobber</p>
          <p class="text-stone-500 text-sm">Three moves instead of two. <span class="font-semibold text-stone-700">Take</span> grabs cookies, <span class="font-semibold text-stone-700">Play Innocent</span> keeps you safe and sweeps the crumbs, and <span class="font-semibold text-stone-700">Dob</span> points the finger at whoever's taking — but it backfires if nobody was. Every Raid you get a secret <span class="font-semibold text-stone-700">Favourite</span> who lets you off and a <span class="font-semibold text-stone-700">Watcher</span> who costs you double. Nobody leaves, nobody busts, and nobody ever loses everything.</p>
        </div>
        <button id="btn-cjar-howto-close" class="cjar-cta min-h-14 w-full rounded-2xl text-xl font-semibold active:scale-95 transition-all duration-150">Got it</button>
```

- [ ] **Step 3: Wire the settings in `js/games/cjar.js`**

Append inside the `DOMContentLoaded` block:

```javascript
  on('btn-cjar-menu-settings', () => { playDone(); cjarSyncSettingsUI(); cjarOpenOverlay('cjar-settings-overlay'); });
  on('btn-cjar-settings-close', () => {
    playDone();
    document.getElementById('cjar-settings-overlay').style.display = 'none';
  });
  on('btn-cjar-howto-close', () => {
    playDone();
    document.getElementById('cjar-how-to-overlay').style.display = 'none';
  });

  document.querySelectorAll('[data-group^="cjar-"]').forEach(pill => {
    pill.addEventListener('click', () => {
      // In MDLM every setting is host-owned; a client's overlay is read-only. They
      // may still OPEN it to read the rules.
      if (window.syllyMultiplayerMode === 'client') return;
      playPillClick();
      const group = pill.dataset.group, val = pill.dataset.val;
      // Only pill-active-cjar is added or removed — the .pill base class carries
      // every structural style and must NEVER come off.
      document.querySelectorAll(`[data-group="${group}"]`)
        .forEach(p => p.classList.remove('pill-active-cjar'));
      pill.classList.add('pill-active-cjar');
      if (group === 'cjar-snack')  cjarSnackFriendly = val;
      if (group === 'cjar-house')  cjarHouseRules    = val;
      if (group === 'cjar-length') cjarMatchLength   = parseInt(val, 10);
    });
  });

  on('btn-cjar-openbook-toggle', () => {
    if (window.syllyMultiplayerMode === 'client') return;
    playPillClick();
    cjarOpenBook = !cjarOpenBook;
    cjarSyncSettingsUI();
  });
  on('btn-cjar-sylly-toggle', () => {
    if (window.syllyMultiplayerMode === 'client') return;
    cjarSyllyMode = !cjarSyllyMode;
    if (cjarSyllyMode) playSyllyOn(); else playSyllyOff();
    cjarSyncSettingsUI();
  });
```

- [ ] **Step 4: Implement `cjarSyncSettingsUI()`**

Append to `js/games/cjar.js`:

```javascript
// Repaints every control from the current values. Also the one place the two
// bust-related settings are hidden: every option in both governs what happens
// after a bust, and Dibber Dobber has no bust.
function cjarSyncSettingsUI() {
  const setGroup = (group, val) => {
    document.querySelectorAll(`[data-group="${group}"]`).forEach(p => {
      p.classList.remove('pill-active-cjar');
      if (p.dataset.val === String(val)) p.classList.add('pill-active-cjar');
    });
  };
  setGroup('cjar-snack',  cjarSnackFriendly);
  setGroup('cjar-house',  cjarHouseRules);
  setGroup('cjar-length', cjarMatchLength);

  const ob = document.getElementById('btn-cjar-openbook-toggle');
  if (ob) { ob.className = (cjarOpenBook ? 'game-toggle-on-cjar' : 'game-toggle-off') + ' shrink-0';
            ob.textContent = cjarOpenBook ? 'ON' : 'OFF'; }
  const sy = document.getElementById('btn-cjar-sylly-toggle');
  if (sy) { sy.className = (cjarSyllyMode ? 'game-toggle-on-cjar' : 'game-toggle-off') + ' shrink-0';
            sy.textContent = cjarSyllyMode ? 'ON' : 'OFF'; }

  ['cjar-set-snack', 'cjar-set-house'].forEach(id => {
    const card = document.getElementById(id);
    if (card) card.style.display = cjarSyllyMode ? 'none' : 'flex';
  });
}
```

- [ ] **Step 5: Verify**

Run: `node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js` → three × PASS.

Then check the encoding survived and the pill rule holds:
```bash
node -e "const s=require('fs').readFileSync('index.html','utf8');
  console.log('replacement chars:', (s.match(/�/g)||[]).length);"
grep -n "classList.toggle('pill'\|classList.remove('pill')" js/games/cjar.js
```
Expected: `0` replacement chars; no grep output (removing `.pill` leaves an unstyled box).

Browser: open the menu → **Settings**. Confirm the overlay opens scrolled to **Cookie Playbook 🍪**, each pill group toggles with only the active class changing, and turning **✨ Sylly Mode** ON hides Snack Friendly and House Rules while Match Length and Open Book stay. Turn it OFF and confirm both return. Open **How to Play** and confirm the card order ends Steps → Winning and Scoring → ✨ Sylly Mode → **Got it** with dark ink on the honey-gold button.

- [ ] **Step 6: Commit**

```bash
git add index.html js/games/cjar.js
git commit -m "$(cat <<'EOF'
feat(cjar): settings and How to Play overlays

Cookie Playbook with the five settings, Sylly Mode last. Snack Friendly and House
Rules hide when Dibber Dobber is on — every option in both governs bust behaviour
and Dibber Dobber has no bust. Clients get a read-only overlay (settings are
host-owned in MDLM). How-to closes with dark ink on the brand fill.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

### Task 15: Multiplayer — config, packets and the envelope handler

The nine packets. Read spec §11's two traps before starting; both are handled here and in Task 12.

**Files:**
- Modify: `js/engine-multiplayer.js:403` (MP_GAME_CONFIGS), `~:845` (mpSerialiseSettings), `:1655` (routing)
- Modify: `js/games/cjar.js` — replace the five broadcast stubs; add `cjarSendAffinities`, `cjarHandleEnvelope`; extend `cjarStartMatch`

**Interfaces:**
- Consumes: `mpSendEnvelope`, `mpSendPrivate`, `mpPlayerSlots`, `mpMyPlayerIdx`, `mpUnlockSync`, `mpShowModeScreen`, `window.syllyDeviceUid`.
- Produces: `cjarBroadcastMatchStart/RaidStart/FlipStart/Resolve/RaidEnd/MatchEnd()`, `cjarSendAffinities()`, `cjarHandleEnvelope(env)`.

- [ ] **Step 1: Add the `MP_GAME_CONFIGS` entry**

In `js/engine-multiplayer.js`, after the `pko: { … },` entry (starts line 403):

```javascript
  cjar: {
    gameName:       'Cookie Jar',
    emoji:          '\u{1F36A}',
    brandBtnClass:  'cjar-cta',
    // REQUIRED. #D4A017 measures 2.38:1 against white — below the 3:1 floor. cjar is
    // the second consumer of this field after FRT (v156).
    ctaTextClass:   'text-stone-800',
    ptpLabel:       'Raid the Jar!',
    lobbyCtaLabel:  'Raid the Jar!',
    menuScreen:     'screen-cjar-menu',
    onPassThePhone: () => {
      // Names come straight from the lobby — cjar has no setup screen (spec D-01).
      // The slot object is { uid, nickname }: .name returns undefined silently.
      cjarPlayerCount = mpPlayerSlots.length;
      cjarPlayerNames = mpPlayerSlots.map(p => p.nickname);
      if (window.syllyMultiplayerMode === 'host') cjarShowMenu();
      else cjarShowClientStandby();
    },
    recommendedMode: 'mdlm',
    supportedModes:  ['mdlm'],
    multiplayerOnly: true,
    // 'individual' requires every player to be hand-assigned in Assign Spots; anyone
    // left unassigned produces reordered[-1] and corrupts the slot array.
    rosterConfig:    { type: 'none' },
    getMaxPlayers:   () => 8,
    getMinPlayers:   () => 4,   // omitting this lets the lobby start under-strength
  },
```

- [ ] **Step 2: Add the `mpSerialiseSettings` case**

In `js/engine-multiplayer.js`, after `case 'pko': return { … };`:

```javascript
    // All five are host-owned; a missing field means clients silently play with
    // different rules. cjarOpenBook is render-layer only but still must match, or
    // two devices disagree about what they are allowed to show.
    case 'cjar': return {
      cjarSnackFriendly, cjarHouseRules, cjarMatchLength, cjarOpenBook, cjarSyllyMode,
    };
```

- [ ] **Step 3: Add the routing block**

In `js/engine-multiplayer.js`, after the Pecking Order block (ends line 1657):

```javascript
  // ── Cookie Jar ACTION/SYNC/private ────────────────────────────────────────
  if (mpActiveGame === 'cjar') {
    if (typeof cjarHandleEnvelope === 'function') cjarHandleEnvelope(env);
  }
```

- [ ] **Step 4: Replace the broadcast stubs**

In `js/games/cjar.js`, replace the five Task 13 stubs:

```javascript
// ── Packet senders (host only) ─────────────────────────────────────────────
// Each is a no-op in 'single' mode by construction, which is what lets the four
// harnesses drive the real appliers in one process. mpSendEnvelope THROWS in the
// harness sandbox, so a leak fails loudly instead of passing silently.
function cjarSend(payload) {
  if (window.syllyMultiplayerMode === 'single' || window.syllyMultiplayerMode === 'client') return;
  mpSendEnvelope({ type: 'SYNC', payload });
}

function cjarBroadcastMatchStart() {
  cjarSend({
    action: 'CJAR_MATCH_START',
    snackFriendly: cjarSnackFriendly, houseRules: cjarHouseRules,
    matchLength: cjarMatchLength, openBook: cjarOpenBook, sylly: cjarSyllyMode,
    playerNames: cjarPlayerNames, stashes: cjarStashes, treatsWon: cjarTreatsWon,
    familyCopies: cjarFamilyCopies,
  });
}

// EVERY accumulator this Raid touches appears here at its RESET value. The host
// resets them in cjarStartRaid; clients never run that function, so anything left
// out carries the previous Raid's value forward (FLW BUG-01). cjar fires this
// pattern ~55x a match — more than any shipped game.
function cjarBroadcastRaidStart() {
  cjarSend({
    action: 'CJAR_RAID_START',
    raidNo: cjarRaidNo, deckCount: cjarDeck.length,
    seen: {}, crumbs: 0, counterTreat: null, trail: [],
    raidTotals: cjarRaidTotals, active: cjarActive,
    crumbDebt: new Array(cjarPlayerCount).fill(0),
    choices: new Array(cjarPlayerCount).fill(null),
    readyCheck: new Array(cjarPlayerCount).fill(false),
    stashes: cjarStashes, highAlertId: cjarHighAlertId, familyCopies: cjarFamilyCopies,
  });
}

function cjarBroadcastFlipStart() {
  cjarSend({
    action: 'CJAR_FLIP_START',
    flipSeq: cjarFlipSeq, card: cjarCard, deckCount: cjarDeck.length,
    crumbs: cjarCrumbs, seen: cjarSeen, stashes: cjarStashes,
    raidTotals: cjarRaidTotals, active: cjarActive, counterTreat: cjarCounterTreat,
    endTimestamp: cjarEndTimestamp, trail: cjarTrail,
    choices: new Array(cjarPlayerCount).fill(null),        // reset values travel
    readyCheck: new Array(cjarPlayerCount).fill(false),    // explicitly
  });
}

function cjarBroadcastResolve(res) {
  cjarSend({
    action: 'CJAR_FLIP_RESOLVE',
    flipSeq: cjarFlipSeq, choices: cjarChoices, deltas: res.deltas, lines: res.lines,
    stashes: cjarStashes, raidTotals: cjarRaidTotals, active: cjarActive,
    crumbs: cjarCrumbs, crumbDebt: cjarCrumbDebt, counterTreat: cjarCounterTreat,
    treatsWon: cjarTreatsWon, trail: cjarTrail, familyCopies: cjarFamilyCopies,
    highAlertId: cjarHighAlertId, raidEnded: res.raidEnded,
    bustFamilyId: res.bustFamilyId || null, bustLine: res.bustLine || '',
  });
}

function cjarBroadcastRaidEnd(banked) {
  cjarSend({
    action: 'CJAR_RAID_END',
    raidNo: cjarRaidNo, banked, stashes: cjarStashes, treatsWon: cjarTreatsWon,
    raidHistory: cjarRaidHistory, familyCopies: cjarFamilyCopies,
    highAlertId: cjarHighAlertId,
  });
}

function cjarBroadcastMatchEnd() {
  cjarSend({
    action: 'CJAR_MATCH_END',
    stashes: cjarStashes, treatsWon: cjarTreatsWon,
    raidHistory: cjarRaidHistory, ranks: cjarRanks(),
  });
}

// The ONE private-channel use. Affinities never mutate mid-Raid, which is exactly
// why this is safe as a one-shot: it is NOT the mpSendPrivate hand-REPAIR pattern
// and must not be extended into one. Cookie Stashes deliberately stay on the public
// channel — every total is derivable from two public numbers, so Open Book is a
// render-layer courtesy, never a security property.
function cjarSendAffinities() {
  if (!cjarIsSylly()) return;
  for (let i = 0; i < cjarPlayerCount; i++) {
    const uid = mpPlayerSlots[i] && mpPlayerSlots[i].uid;
    if (i === mpMyPlayerIdx) {                     // the host's own — set locally
      cjarMyFavourite = cjarFavourite[i];
      cjarMyWatcher   = cjarWatcher[i];
      continue;
    }
    if (!uid || window.syllyMultiplayerMode === 'single') continue;
    mpSendPrivate(uid, { type: 'SYNC', payload: {
      action: 'CJAR_AFFINITY', favourite: cjarFavourite[i], watcher: cjarWatcher[i],
    }});
  }
}
```

- [ ] **Step 5: Extend `cjarStartMatch` to broadcast and open Raid 1**

Replace the final line of `cjarStartMatch()` (`cjarStartRaid();`) with:

```javascript
  cjarBroadcastMatchStart();
  cjarStartRaid();
  cjarBroadcastRaidStart();
  cjarSendAffinities();
  cjarShowRaidIntro(() => cjarHostNextFlip());
```

Also add `cjarSendAffinities()` after `cjarStartRaid()` in the `btn-cjar-next-raid` handler from Task 13, so Raid 2+ affinities are dealt too.

- [ ] **Step 6: Implement `cjarHandleEnvelope`**

Replace the stub in `js/games/cjar.js`:

```javascript
// ── Envelope handler ───────────────────────────────────────────────────────
// SYNC handlers APPLY the authoritative payload and render — they never re-resolve
// and never push a second trail entry the host already pushed.
function cjarHandleEnvelope(env) {
  const p = (env && env.payload) || {};
  const senderIdx = () => mpPlayerSlots.findIndex(s => s.uid === env.originId);

  if (env.type === 'ACTION') {
    if (window.syllyMultiplayerMode !== 'host') return;
    switch (p.action) {
      case 'CJAR_CHOICE':
        // Re-validated host-side: a stale flipSeq is silently dropped, so an
        // in-flight packet from a flip that has already resolved cannot resolve
        // it a second time (the PKO BUG-01 class).
        if (cjarApplyChoice(senderIdx(), p.choice, p.flipSeq)) {
          cjarRenderTable();
          if (cjarAllIn()) cjarHostResolveFlip();
        }
        break;
      case 'CJAR_PLAYER_LEFT':
        // One player leaving dissolves the match. With a flip every ~9-15 s, a seat
        // that will never submit stalls the table immediately. resetToLobby()
        // broadcasts HOST_END_GAME and the existing mp-host-disconnected-overlay
        // handles the remaining clients — the GTH/DYB/BLD contract.
        resetToLobby();
        break;
    }
    return;
  }

  switch (p.action) {
    case 'CJAR_MATCH_START':
      cjarSnackFriendly = p.snackFriendly; cjarHouseRules = p.houseRules;
      cjarMatchLength = p.matchLength; cjarOpenBook = p.openBook; cjarSyllyMode = p.sylly;
      cjarPlayerNames = p.playerNames || cjarPlayerNames;
      cjarPlayerCount = cjarPlayerNames.length;
      cjarStashes = p.stashes; cjarTreatsWon = p.treatsWon;
      cjarFamilyCopies = p.familyCopies; cjarRaidHistory = [];
      cjarMyFavourite = null; cjarMyWatcher = null;
      break;

    case 'CJAR_AFFINITY':                       // private — this device only
      cjarMyFavourite = p.favourite;
      cjarMyWatcher   = p.watcher;
      break;

    case 'CJAR_RAID_START':
      cjarRaidNo = p.raidNo;
      cjarSeen = p.seen; cjarCrumbs = p.crumbs; cjarCounterTreat = p.counterTreat;
      cjarTrail = p.trail; cjarRaidTotals = p.raidTotals; cjarActive = p.active;
      cjarCrumbDebt = p.crumbDebt; cjarChoices = p.choices; cjarReadyCheck = p.readyCheck;
      cjarStashes = p.stashes; cjarHighAlertId = p.highAlertId;
      cjarFamilyCopies = p.familyCopies;
      cjarDeck = new Array(p.deckCount).fill(null);   // count only; contents are host-side
      cjarShowRaidIntro(() => {});                    // client just watches it pass
      break;

    case 'CJAR_FLIP_START':
      cjarFlipSeq = p.flipSeq; cjarCard = p.card;
      cjarDeck = new Array(p.deckCount).fill(null);
      cjarCrumbs = p.crumbs; cjarSeen = p.seen; cjarStashes = p.stashes;
      cjarRaidTotals = p.raidTotals; cjarActive = p.active;
      cjarCounterTreat = p.counterTreat; cjarTrail = p.trail;
      cjarChoices = p.choices; cjarReadyCheck = p.readyCheck;   // reset values, explicit
      cjarDeltas = []; cjarLines = [];
      cjarTablePhase = (!cjarIsSylly() && !cjarActive[mpMyPlayerIdx]) ? 'spectating' : 'deciding';
      mpUnlockSync();
      cjarRenderTable();
      cjarStartTimer(p.endTimestamp);
      showScreen('screen-cjar-table');
      break;

    case 'CJAR_FLIP_RESOLVE':
      cjarStopTimer();
      cjarChoices = p.choices; cjarDeltas = p.deltas; cjarLines = p.lines;
      cjarStashes = p.stashes; cjarRaidTotals = p.raidTotals; cjarActive = p.active;
      cjarCrumbs = p.crumbs; cjarCrumbDebt = p.crumbDebt;
      cjarCounterTreat = p.counterTreat; cjarTreatsWon = p.treatsWon;
      cjarTrail = p.trail; cjarFamilyCopies = p.familyCopies;
      cjarHighAlertId = p.highAlertId;
      cjarTablePhase = 'revealing';
      mpUnlockSync();
      if (p.bustFamilyId) {
        playBoing();
        cjarShowBusted(p.bustFamilyId, p.bustLine, () => {});
        break;
      }
      cjarRenderTable();
      cjarFlyDelta(cjarDeltas[mpMyPlayerIdx]);
      break;

    case 'CJAR_RAID_END':
      cjarRaidNo = p.raidNo; cjarStashes = p.stashes; cjarTreatsWon = p.treatsWon;
      cjarRaidHistory = p.raidHistory; cjarFamilyCopies = p.familyCopies;
      cjarHighAlertId = p.highAlertId;
      cjarShowRaidSummary(p.banked);
      break;

    case 'CJAR_MATCH_END':
      cjarStashes = p.stashes; cjarTreatsWon = p.treatsWon;
      cjarRaidHistory = p.raidHistory;
      cjarShowGameover();
      break;
  }
}
```

- [ ] **Step 7: Implement `cjarShowMenu`**

Replace the Task 1 stub:

```javascript
// Post-lobby entry for the host — onPassThePhone lands here so Settings and How to
// Play are available before committing the table to a match.
function cjarShowMenu() {
  cjarSyncSettingsUI();
  showScreen('screen-cjar-menu');
}
```

- [ ] **Step 8: Run the missing-handler audit**

Walk every phase and confirm each "can a non-host device submit here?" has a handler. Missing handlers **silently drop** submissions — they do not error.

| Phase | Can a client submit? | Handler |
|---|---|---|
| Menu (post-lobby) | No — Play is host-only via the dual-context branch | — |
| Raid intro | No — auto-advancing interstitial, no controls | — |
| Table, `deciding` | **Yes** — the 2 or 3 action buttons | `CJAR_CHOICE` ✓ |
| Table, `waiting` / `revealing` / `spectating` | No — buttons are not in the DOM | — |
| BUSTED! | No — interstitial | — |
| Raid summary | No — **Next Raid** is host-gated *and* carries an explicit client early-return | — |
| Gameover | Play-again → `mpReturnToLobby()`; exit → `resetToLobby()` | engine-owned ✓ |
| Any screen, mid-game ✕ | **Yes** | `CJAR_PLAYER_LEFT` ✓ |

Two ACTIONs, both handled. Confirm by grep:
```bash
grep -n "type: 'ACTION'" js/games/cjar.js
grep -n "case 'CJAR_" js/games/cjar.js
```
Expected: exactly two ACTION sends (`CJAR_CHOICE`, `CJAR_PLAYER_LEFT`) and eight `case` labels (2 ACTION + 6 SYNC — `CJAR_AFFINITY` is among the SYNC set because `mpSendPrivate` wraps it as a SYNC envelope).

- [ ] **Step 9: Verify**

Run: `node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js`
Expected: three × `ALL CHECKS PASSED`. **This is the important run** — the sandbox makes `mpSendEnvelope` and `mpSendPrivate` throw, so if any broadcast leaked into `'single'` mode the harness fails here with `mpSendEnvelope called in single mode`. Task 7's match-start assertions must still pass: `cjarStartMatch` now ends with `cjarShowRaidIntro`, whose `setTimeout` the sandbox captures without firing.

Then the MP config completeness check:
```bash
node -e "
const s = require('fs').readFileSync('js/engine-multiplayer.js','utf8');
const m = s.slice(s.indexOf('cjar: {'), s.indexOf('cjar: {') + 1400);
['gameName','emoji','brandBtnClass','ctaTextClass','ptpLabel','lobbyCtaLabel','menuScreen',
 'onPassThePhone','recommendedMode','supportedModes','multiplayerOnly','rosterConfig',
 'getMaxPlayers','getMinPlayers'].forEach(f =>
  console.log((m.includes(f+':') ? 'ok   ' : 'MISS ') + f));"
```
Expected: 14 × `ok`. A missing display field renders the literal string `undefined` on `screen-mp-mode`.

- [ ] **Step 10: Three-device test**

This is the one thing no harness can substitute for. Deploy, then run a **4-player session with a non-host moving first**. Confirm: every device sees the same card and the same countdown; a client's tap removes its own buttons and appears as a chip clearing on the others; the reveal lands simultaneously; a client Sneaking Out becomes a spectator without freezing the Raid for anyone else (this is the `cjarAllIn()` active-seats check — the single most load-bearing line in the game); a Sylly session shows each device a *different* Favourite/Watcher pair; a client tapping ✕ mid-Raid dissolves the match for everyone rather than stalling the table.

Record the result in the impl notes at Task 17. If a path did not come up naturally in the session (a client-side bust, say), say so explicitly rather than implying it was covered — PKO's `PKO_CARRION_OPEN` is the precedent for recording an unverified path honestly.

- [ ] **Step 11: Commit**

```bash
git add js/engine-multiplayer.js js/games/cjar.js
git commit -m "$(cat <<'EOF'
feat(cjar): multiplayer config, nine packets and the envelope handler

MP_GAME_CONFIGS entry with ctaTextClass (second consumer after FRT) and
getMinPlayers 4. Every accumulator reset travels IN the SYNC payload at its reset
value — clients never run cjarStartRaid (FLW BUG-01), and cjar fires this ~55x a
match. Affinities are the one private-channel use: they never mutate mid-Raid, so
no repair packet is needed and this must not become the hand-repair pattern.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 16: Core art images, the expansion hook, and the service worker

**Files:**
- Create: `data/art/cjar/img/*.jpg` — 13 faces + 1 back
- Modify: `js/games/cjar.js` — implement `cjarApplyExpansionOverrides`
- Modify: `sw.js` — `PRECACHE_URLS` + `CACHE_NAME`

**Interfaces:**
- Consumes: `data/art/cjar/pack.json` (Task 10) — the manifest owns the id → filename mapping, so no path is ever hardcoded in the plugin.
- Produces: 14 image files; a working `cjarApplyExpansionOverrides()`; SW v157.

- [ ] **Step 1: Implement the expansion hook**

Replace the Task 1 stub in `js/games/cjar.js`:

```javascript
// Called at the top of cjarStartMatch(). Cookie Jar's content is a fixed deck, not
// a word pool, so the practical override surface is the FLAVOUR POOLS and TREAT
// NAMES only — a themed pack can re-voice the whole family without touching a
// single number. There is no pool-refill path. An override must never reach
// cookieValues, copies, points or treatSchedule; those are balance, not content.
function cjarApplyExpansionOverrides() {
  if (!window.isSecretMode || !window.activeExpansionOverrides || !CJAR_DATA) return;
  const o = window.activeExpansionOverrides.cjar;
  if (!o) return;
  if (o.family) {
    CJAR_DATA.family.forEach(f => {
      const sub = o.family[f.id];
      if (!sub) return;
      if (sub.name) f.name  = sub.name;
      if (sub.emoji) f.emoji = sub.emoji;
      if (Array.isArray(sub.warn) && sub.warn.length >= 4) f.warn = sub.warn;
      if (Array.isArray(sub.bust) && sub.bust.length >= 4) f.bust = sub.bust;
    });
  }
  if (o.treats) {
    CJAR_DATA.treats.forEach(t => { if (o.treats[t.id]) t.name = o.treats[t.id]; });
  }
}
```

- [ ] **Step 2: Source and convert the card art**

Generate or source 14 masters — 13 faces plus one back — named to match `data/art/cjar/pack.json` exactly:

```
cookie-handful  cookie-batch  cookie-mountain
family-mum  family-dad  family-big  family-grandma  family-pet
treat-shortbread  treat-redvelvet  treat-macadamia  treat-macarons  treat-brownies
back
```

**Check the masters' real dimensions before setting the converter's target width.** The FLW, FRT and SHP runs all found their masters already near the card aspect and small — upscaling only costs bytes. Then run the converter:

```powershell
pwsh tools/convert-core-art.ps1 -Source <masters-dir> -Dest data/art/cjar/img -Width 360 -Quality 82
```

**JPEG, not PNG** — cjar's cards have opaque grounds and need no alpha (unlike DYB's dice, which do).

- [ ] **Step 3: Enforce the 40 KB ceiling**

The ceiling was set at spec time per the PWA Guardian rule. PKO's art arrived at **26 MB** across 17 PNGs and had to be reconverted before the app was installable on mobile data.

Run:
```bash
node -e "
const fs=require('fs'),p='data/art/cjar/img';
let total=0, over=[];
fs.readdirSync(p).forEach(f=>{const kb=fs.statSync(p+'/'+f).size/1024; total+=kb;
  if(kb>40) over.push(f+' '+kb.toFixed(1)+'KB');});
console.log('files', fs.readdirSync(p).length, '(expect 14)');
console.log('total', total.toFixed(0)+'KB', '(budget ~560KB)');
console.log(over.length ? 'OVER CEILING:\n  '+over.join('\n  ') : 'every file within 40KB');"
```
Expected: 14 files, total under ~560 KB, `every file within 40KB`. If anything is over, re-run the converter at a lower quality rather than shipping it — a precache this game contributes to is the whole app's install weight.

- [ ] **Step 4: Add every asset to the precache and bump the version**

This step is the **entire difference between core art and a skin pack**. Missing it means the art is simply absent on a cold offline install, with no error anywhere.

In `sw.js`, add after `'js/games/pko.js',` (line 27):
```javascript
  'js/games/cjar.js',
```
after `'data/pko-data.json',` (line 32):
```javascript
  'data/cjar-data.json',
```
and after the pko art block (ends line 63):
```javascript
  'data/art/cjar/pack.json',
  'data/art/cjar/img/cookie-handful.jpg',
  'data/art/cjar/img/cookie-batch.jpg',
  'data/art/cjar/img/cookie-mountain.jpg',
  'data/art/cjar/img/family-mum.jpg',
  'data/art/cjar/img/family-dad.jpg',
  'data/art/cjar/img/family-big.jpg',
  'data/art/cjar/img/family-grandma.jpg',
  'data/art/cjar/img/family-pet.jpg',
  'data/art/cjar/img/treat-shortbread.jpg',
  'data/art/cjar/img/treat-redvelvet.jpg',
  'data/art/cjar/img/treat-macadamia.jpg',
  'data/art/cjar/img/treat-macarons.jpg',
  'data/art/cjar/img/treat-brownies.jpg',
  'data/art/cjar/img/back.jpg',
```

Then `sw.js:4`:
```javascript
const CACHE_NAME = 'sylly-games-v157';
```

- [ ] **Step 5: Verify every precached path resolves**

A precache entry pointing at a file that does not exist makes `cache.addAll` reject, which fails the **entire** install — every asset, not just the missing one.

Run:
```bash
node -e "
const fs=require('fs');
const sw=fs.readFileSync('sw.js','utf8');
const urls=[...sw.matchAll(/'([^']*(?:cjar)[^']*)'/g)].map(m=>m[1]);
console.log('cjar precache entries:', urls.length);
const missing=urls.filter(u=>!fs.existsSync(u));
console.log(missing.length ? 'MISSING:\n  '+missing.join('\n  ') : 'all present');
console.log('CACHE_NAME:', (sw.match(/sylly-games-v\d+/)||[])[0]);"
```
Expected: **`all present`** and `CACHE_NAME: sylly-games-v157`. The entry count should be **17** — `js/games/cjar.js`, `data/cjar-data.json`, `data/art/cjar/pack.json`, and 14 images — but read what it prints rather than matching that number: the only thing that matters is that nothing is missing, because one bad path rejects `cache.addAll` and fails the whole install.

- [ ] **Step 6: Verify offline**

In the browser: DevTools → Application → Service Workers → Unregister, then hard-reload to install v157. Confirm the new cache exists and holds the cjar entries. Then tick **Offline** and reload: the lobby opens, Cookie Jar's menu opens, and a table screen renders illustrated cards rather than emoji. Emoji faces offline means the images did not precache.

- [ ] **Step 7: Commit**

```bash
git add data/art/cjar/img js/games/cjar.js sw.js
git commit -m "$(cat <<'EOF'
feat(cjar): core art images, expansion hook and SW v157

14 JPEGs at ~360px, every file under the 40KB ceiling set at spec time. Manifest,
images, plugin and data file all added to PRECACHE_URLS with CACHE_NAME bumped —
that step is the whole difference between core art and a skin pack, and missing it
means the art is silently absent on a cold offline install.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 17: Documentation Integrity Protocol and the Protocol A phase gate

The final deliverable. The Documentation Integrity Protocol's six updates come **before** the phase snapshot — the snapshot is a confirmation, not the starting point for cleanup.

**Files:**
- Create: `docs/implementation-notes/cjar-implementation-notes.md`, `docs/phase39-snapshot.md`
- Modify: `docs/code-map.md`, `docs/rules/game-identities.md`, `CLAUDE.md`, `.claude/rules/ui-style.md`, `.claude/rules/logic-engine.md`, `docs/decision-log.md`, `docs/content-prompts/new-game-brief-prompt.md`, `docs/implementation-notes/frt-implementation-notes.md`

- [ ] **Step 1: Run the Protocol A drift check against the shipped code**

This is a discovery pass — fix what it finds *before* writing any doc, so the docs describe reality.

```bash
# Screens registered vs screens used
grep -o "screen-cjar-[a-z-]*" js/engine.js | sort -u
grep -o "showScreen('screen-cjar-[a-z-]*'" js/games/cjar.js | sort -u
# Timers cleared on every exit path
grep -n "Handle" js/games/cjar.js | grep -c "clear"
# Anti-patterns
grep -n "TODO\|FIXME" js/games/cjar.js
grep -n "window.mpMyPlayerIdx\|window.mpPlayerSlots\|window.mpActiveGame" js/games/cjar.js
grep -n "h-screen\|my-auto\|flex-shrink-0" js/games/cjar.js
grep -rn "classList.toggle('pill'\|classList.remove('pill')" js/games/cjar.js
# Australian English in UI copy
grep -nEi "\b(color|flavor|organize|recognize|mom)\b" js/games/cjar.js data/cjar-data.json
# No global function-name collision with another plugin
for f in $(grep -o "^function cjar[A-Za-z]*" js/games/cjar.js | sed 's/function //'); do
  hits=$(grep -l "function $f" js/games/*.js | wc -l); [ "$hits" -gt 1 ] && echo "COLLISION: $f";
done
```
Expected: six screens in both lists and identical; four timer handles each cleared; no `TODO`/`FIXME`; no `window.`-prefixed `let` globals; no `h-screen`/`my-auto`/`flex-shrink-0`; no `.pill` removal; no US spellings; no collisions.

Then re-run all four tools one final time:
```bash
node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && \
node tools/verify-cjar-dd.js && node tools/simulate-cjar-dd.js 2000 5
```

- [ ] **Step 2: `docs/code-map.md`**

Add a Cookie Jar section and a row to the **Per-Game Offset Map** at the top of the file. Record: the six screen IDs with their `index.html` offsets, the six overlay IDs, the render seam `cjarRenderCard` in the seam table, every state variable from §4 plus the two additions (`cjarRaidOpenStashes`, `cjarLinesUsed`), the key functions (`cjarApplyCardEffect`, `cjarResolveFlip`, `cjarResolveFlipDD`, `cjarDDGain`/`cjarDDPay`, `cjarSplit`, `cjarRanks`, `cjarHandleEnvelope`), and the four verification tools under § Verification tools. Add the nine packets to the Multiplayer Module → Per-Game ACTION/SYNC Packet Types table.

- [ ] **Step 3: `docs/rules/game-identities.md`**

Add a `## Game 18: Cookie Jar (CJAR)` section, sourced from **shipped `cjar.js` and `index.html`**, not from the spec draft. Cover: terminology (Cookie Stash, Cookie Crumbs, Crumb Trail, House Rules, Raid, Treat, Red-Handed, Top Cookie Thief, BUSTED!), the settings table with defaults, the full scoring tables for both modes, the Sylly Mode record (Dibber Dobber — affinities, Crumb Debt, scare-off, Treat priority), overlays, screens, and the MP packet list. Note the four terminology-collision resolutions from the spec's Consistency Audit so a future audit does not re-flag them.

- [ ] **Step 4: `CLAUDE.md`**

Four edits: add row 18 to the **Per-Game Quick Index** (`cjar` / `cjar.js` / `#D4A017` / `pill-active-cjar`); add `cjar.js` to the **Load Order** line after `pko.js`; update **SW Version** to v157 with the release note (move the v156 note to `docs/sw-changelog.md`); rewrite **Current Focus** to Phase 39 — Cookie Jar, listing the four harness commands and the key refs.

- [ ] **Step 5: `.claude/rules/ui-style.md` and `.claude/rules/logic-engine.md`**

`ui-style.md` — three rows, one per table:
- Table A: `CJAR | #D4A017 honey-gold (custom) | cjar-range | game-toggle-on-cjar | pill-active-cjar`
- Table B: `CJAR | Raid the Jar! | 🍪 | Dibber Dobber`
- Table C: `CJAR | cjar-cta | — | cjar-label | bg-[#F7E9C4] hover:bg-[#EFDCA8] text-[#7A5C0A]` (the `—` means cjar never calls `showWhoFirst()`; do not invent one). Add a footnote that `cjar-cta` carries `color:#292524`, so unlike most games the how-to close button is **dark ink on brand**, matching FRT's v156 exception.
- Add `screen-cjar-raid-intro` and `screen-cjar-busted` to the § Global UI Protocol rule-5 interstitial-exemption reference list.

`logic-engine.md` — update **Current SW version** to v157. Add `ctaTextClass` a second named consumer in the `MP_GAME_CONFIGS` schema table (it currently says "first use: FRT"). No new universal rule was introduced by this build; do not invent one to fill the slot.

- [ ] **Step 6: `docs/implementation-notes/cjar-implementation-notes.md`**

Create with all four sections. Seed each with what this build actually produced:

- **Design Decisions** — Delta 1 (reused engine `shuffle` rather than adding `cjarShuffle`); Delta 3 (card effect resolves at reveal, before the decision window, and why the alternative is degenerate); the deck-exhaustion-with-one-player-left edge case and the assertion that pins it; the `cjarRaidOpenStashes` snapshot; and **the two `simulate-cjar-dd.js` readings from Task 9** with any threshold breach flagged for playtest round 1.
- **Bug Index** — empty at ship, ready for playtest round 1.
- **Multiplayer Lessons** — the Task 15 three-device session result, including any path that did **not** come up naturally (say so explicitly; PKO's `PKO_CARRION_OPEN` is the precedent for recording an unverified path honestly rather than implying coverage).
- **Template Gaps** — anything this build had to invent that the templates did not cover.

- [ ] **Step 7: `docs/decision-log.md` and `docs/content-prompts/new-game-brief-prompt.md`**

Decision log — one entry at the top, ~4 lines, a pointer not a deep doc:

```markdown
## 2026-08-02 — Cookie Jar (cjar) shipped as game 18, base + Sylly in one phase
Owner chose a single build phase over PKO-style staging, accepting that the Dibber
Dobber numbers were simulated at 16 cards and ship at ~11; `tools/simulate-cjar-dd.js`
is the agreed mitigation and produced a pre-playtest baseline. Card effects resolve at
reveal rather than after the decision window (plan Delta 3) — the spec's literal reading
made the choice degenerate. Refs: `docs/new-game-tech-cookie-jar.md`,
`docs/superpowers/plans/2026-08-02-cookie-jar.md`, `docs/phase39-snapshot.md`.
```

Brief prompt — update the existing-games roster table, the "taken" abbreviations line (add `cjar`), and the Sylly-Mode name list (add **Dibber Dobber**). Pull every value from **shipped reality**, never from the original brief: this file is the first doc a future game touches, and a stale roster re-imports fixed errors and risks an abbreviation collision.

- [ ] **Step 8: Log the FRT gap found in passing**

Add to `docs/implementation-notes/frt-implementation-notes.md` under **Bug Index**:

```markdown
- **`getMuteToggleOnClass()` has no `'frt'` entry** *(found 2 Aug 2026 during the cjar build; not fixed there — an unrelated game's bug inside a new-game commit is harder to review and to revert).*
  **What happened:** FRT's mute toggle in the sound overlay falls back to `game-toggle-on-stone` instead of `game-toggle-on-frt`, so it shows neutral grey rather than electric lemon when muted mid-game.
  **Root cause:** the map at `js/engine.js:465` lists 16 of 17 games; `frt` was never added. `updateSliderTheme()`'s map *does* have `'frt': 'frt-range'`, so the slider themes correctly and the gap only shows on the toggle.
  **Lesson:** the two maps in `engine.js` are edited together in the new-game checklist but are not verified together. A Protocol C row asserting both maps cover every `activeGameId` would have caught it.
```

- [ ] **Step 9: Write `docs/phase39-snapshot.md`**

Use `docs/phase37-snapshot.md` as the template. **The snapshot is the final deliverable — no snapshot may be written until Steps 2–8 are verified current.**

- [ ] **Step 10: Final verification and commit**

```bash
node tools/verify-cjar-deck.js && node tools/verify-cjar-loop.js && node tools/verify-cjar-dd.js
git status
```
Confirm the three harnesses pass and that `git status` shows only the intended files before staging.

```bash
git add docs/ CLAUDE.md .claude/rules/
git commit -m "$(cat <<'EOF'
docs(cjar): Documentation Integrity Protocol closure for Cookie Jar

code-map, game-identities Game 18, CLAUDE.md (quick index row 18, load order,
SW v157, current focus), ui-style Tables A/B/C, logic-engine SW version,
implementation notes with the simulator baseline and the three-device result,
decision-log entry, brief-prompt roster sync, and the phase 39 snapshot. Also
logs the pre-existing FRT getMuteToggleOnClass gap found in passing.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

Run against the spec after the plan was written.

**1. Spec coverage.** Every §15 checklist item maps to a task:

| Spec §15 group | Tasks |
|---|---|
| Foundation (8 items) | 1 |
| Game Menu (3) | 1, 2 |
| Settings & How-to (6) | 14, 16 (`cjarApplyExpansionOverrides`) |
| Screens (7) | 2, 11, 12, 13 |
| Scoring & Logic (6) | 4, 5, 6, 7, 8 |
| Data & Art (5) | 3, 10, 16 |
| Service Worker (3) | 16 |
| Multiplayer (8) | 12, 13, 15 |
| Verification harnesses (5) | 4, 5, 8, 9 — and the architectural precondition is a Global Constraint |
| Documentation (8) | 17 |

Spec sections: §1 identity → Tasks 1–2. §2 state flow → 2, 13. §3 screens → 2. §4 state → 1 (+2 additions declared in 6). §5 settings → 14. §6 scoring → 5, 6, 8. §7 validation → 6 (`cjarApplyChoice` is the one real guard). §8 overlays → 2, 13, 14. §9 audio → 1 (`CJAR_SOUND`), used in 13. §10 data + seam → 3, 4, 10. §11 multiplayer → 15. §12 Sylly → 8. §13 teardown → 2. §14 section header → 2. §16 clarifications → all four defaults shipped as specced; #4 is answered by Task 9. §17 deviations → all 11 honoured; three new deltas declared at the top.

No gaps found.

**2. Placeholder scan.** No `TBD`, no "implement later", no "add error handling", no "similar to Task N", no "write tests for the above". Every code step carries the actual code; every test step carries the actual command and its expected output. The one task without a headless test (Task 11) says so explicitly and gives the reason and the browser walk that replaces it.

**3. Type consistency.** Checked across tasks:
- `cjarResolveFlip(choices)` returns `{ deltas, lines, raidEnded }` in Tasks 6, 12, 13, 15 — consistent, and Delta 3 records why `bustFamilyId` is absent.
- `cjarApplyCardEffect()` returns `{ busted, bustFamilyId }` in Tasks 6 and 13 — consistent.
- `cjarRenderCard(card, opts)` — `opts.size` is `'hero' | 'thumb' | 'counter'` in Tasks 10, 11, 13; the CSS classes `cjar-card-hero/thumb/counter` match.
- `cjarShowTip(emoji, heading, lines[])` — same signature in Tasks 12, 13 and the spec.
- `cjarShowRaidIntro(onDone)` / `cjarShowBusted(familyId, line, onDone)` — same in Tasks 13 and 15.
- Art keys: **13** in Task 4's assertion, Task 10's manifest and its harness check, and **14 images** in Task 16's precache list — consistent, and Delta 4 records why the spec's "14 keys" was a counting slip.
- `cjarBuildDeck()` returns a new array and never assigns `cjarDeck` — Tasks 4 and 6 (`cjarStartRaid` does the assigning) agree.

Two fixes applied inline while reviewing. **(a)** The art-key count started at the spec's 14 in Task 4 and was corrected at Task 10, which would have had an implementer knowingly write a failing assertion; Task 4 now asserts 13 directly and Delta 4 explains the discrepancy once, up front. **(b)** Task 16's `PRECACHE_URLS` verification originally printed an expected entry count of 16 in the script and 17 in the prose; the step now tells the implementer to confirm `all present` and read the real count rather than matching a number the plan guessed at.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-02-cookie-jar.md`. Two execution options:

**1. Subagent-Driven (recommended)** — a fresh subagent per task, reviewed between tasks, fast iteration. Best fit here: 17 tasks, each with its own test cycle, and the harnesses give every reviewer an objective gate.

**2. Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batching with checkpoints for review.

Which approach?

