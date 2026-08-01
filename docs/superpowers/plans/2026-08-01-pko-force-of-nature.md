# Pecking Order — Force of Nature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Force of Nature — PKO's Sylly Mode — as 8 random per-Encounter events plus a fixed opener, one new card (Mimic), one new screen, and one new overlay, against the confirmed Stage 2 spec `docs/new-game-tech-pecking-order-fon.md`.

**Architecture:** Everything lands in the existing `js/games/pko.js` plugin (single-file-per-game is the project convention). Events are a const array of plain data objects (`PKO_EVENTS`); *mutating* events own an `onFire()` run host-side on an empty board, *passive* events set a flag that an existing single-source predicate reads (`pkoPredators` for The Great Reversal, a new `pkoTrackOk` for the track locks). The Mimic never reaches the board — it resolves to its claimed species at play time inside one new function, `pkoResolveGroup`, which `pkoAnswers` routes through, so `pkoBeats()` and `pkoMarks` are untouched. Scoring becomes multi-winner because Extinction Event can empty several Hoards at once.

**Tech Stack:** Vanilla ES6+ JS (all globals, no modules, no build step), Tailwind via the local `js/lib/tailwind-play.js`, Web Audio API for sound, Node `vm` harnesses under `tools/` for verification.

## Global Constraints

Every task's requirements implicitly include this section.

- **No build tools, no npm, no external libraries.** Vanilla JS, single-page app, all symbols global.
- **Australian English** in every user-facing string and comment (colour, organise, recognise). Metric only.
- **Never full-read `index.html`** (~515 KB). Grep for the id, then `Read` with `offset`/`limit`. PKO's markup runs from **line 8552** (`<!-- ════ PECKING ORDER (pko) ════`) to line ~8999.
- **Never run a scripted sweep over `index.html`.** Targeted single `Edit` calls are fine; a systematic multi-match rewrite corrupts UTF-8 into mojibake. If a change needs more than a handful of anchors, write a Node script that reads/writes with explicit `utf8` encoding.
- **Both harnesses must be green at the end of every task**, and neither may be made green by weakening a check:
  ```bash
  node tools/verify-pko-chain.js && node tools/verify-pko-loop.js
  ```
  From Task 4 onward, add `&& node tools/verify-pko-events.js`.
- **The harness sandbox throws on `mpSendEnvelope` / `mpSendPrivate`.** Every new broadcast must sit inside `if (window.syllyMultiplayerMode !== 'single')`. A missed guard fails loudly — that is the design.
- **Appliers take an explicit `playerIdx`** and never read `mpMyPlayerIdx`. An applier that reads its own seat cannot be tested by the harness at all.
- **Host-as-participant:** `engine-multiplayer.js` drops every envelope where `originId === syllyDeviceUid`. A host NEVER self-sends an ACTION — it mutates directly and broadcasts the resulting SYNC.
- **Accumulators reset in-payload.** Any array the host resets at Clash/Encounter start must travel in that SYNC at its reset value (`pkoEventsFired: []`), or clients carry the previous round's value forward.
- **Timer handles clear in three places:** the quit-confirm handler, `pkoResetState()`, and any early transition out of the phase. `pkoUnchallengedTimer` is the reference.
- **Every screen is the Stack:** `<section class="flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">` wrapping ONE `flex flex-col w-full max-w-sm gap-4` column. No `h-screen`, no `my-auto`, no split footer.
- **Motion:** transform/opacity only, ≤300 ms for non-overlay motion, never `ease-in`. The global `prefers-reduced-motion` block in `css/styles.css` already covers new animations — do not add a second one.
- **SW version bumps exactly once**, in Task 1: `sylly-games-v148` → `sylly-games-v149` in `sw.js:4`. Do not bump again in later tasks.
- **PKO brand:** `#854D0E`. Decision-modal border is **`border-[#E4CFA3]`** (see Spec Correction C3). CTA class is `pko-cta`; label class is `pko-label`; active pill is `pill-active-pko`.
- **Any button revealed with `display:flex` must carry flex centering** — `pko-cta` already declares it; a Tailwind-coloured button needs `flex items-center justify-center` in the HTML.

## Spec Corrections

Four load-bearing errors in the Stage 2 spec, found while reading shipped code. Each is resolved below and the task that fixes it is named. **Follow this section, not the spec, where they disagree** — and record each in the impl-notes at Task 12.

| # | Spec says | Shipped reality | Resolution |
|---|-----------|-----------------|------------|
| **C1** | §7.1's `pkoResolveGroup` returns `{ok:false}` whenever `claim === PKO_POACHER_ID` | A plain one-card Poacher answer (`['human']`) is legal today and is the *only* thing that beats an Eagle-Mark | Reject a Poacher claim **only when the group contains a Mimic**. Without this guard, wiring `pkoResolveGroup` into `pkoAnswers` makes every solo Poacher illegal. **Task 7.** |
| **C2** | §14 — "Mimic card face … add the `mimic` entry to `data/art/pko/pack.json` … add the image to `PRECACHE_URLS`" | `data/art/pko/img/mimic.jpg` **already exists** (25 404 bytes, under the 40 KB ceiling), is already keyed in `pack.json`, and is already at `sw.js:61` | No art work. Task 1 shrinks to the JSON entry + the version bump. |
| **C3** | §12 — carrion overlay border `border-[#C9A227]` "matching `pko-quit-overlay`" | `pko-quit-overlay` uses `border-[#E4CFA3]` (`index.html:8954`); so do the Stampede and New Match modals | Use **`border-[#E4CFA3]`**. The spec's stated intent (match the quit overlay) is what governs. **Task 10.** |
| **C4** | §6 / §15 — "`tools/verify-pko-loop.js` … scoring checks assume a single winner — **must be rewritten**" | The loop harness never calls `pkoResolveClash` directly. Every scoring assertion goes through an applier (`pkoApplyStake`/`pkoApplyChallenge`/`pkoApplyStampede`) and reads `P.scores` / `P.history`, both of which survive the array signature unchanged | No rewrite. The work is **additive**: keep all existing checks green and add joint-winner coverage. **Task 3.** |

One more thing the spec does not say, because it postdates it: **`tools/verify-pko-chain.js:81` hard-asserts `ids.length === 14`** with the comment "Mimic is Phase 2". Adding the Mimic makes that check fail. It is the *only* chain check the new entry disturbs — every other assertion there is Mimic-safe by construction (the Mimic has no `beaten_by`, no `reach_beaten_by`, and is excluded from the Pool). Task 1 updates it.

## File Structure

| File | Responsibility | Tasks |
|------|----------------|-------|
| `data/pko-data.json` | +1 entry (the Mimic), 15th and last | 1 |
| `sw.js` | `CACHE_NAME` bump only | 1 |
| `js/games/pko.js` | All Force of Nature logic — registry, draw gate, resolvers, appliers, screen/overlay wiring | 2–11 |
| `js/engine.js` | `allScreens[]` += `screen-pko-event`; `resetToLobby()` overlay teardown += `pko-carrion-overlay` | 4, 10 |
| `index.html` | `screen-pko-event`, `pko-carrion-overlay`, settings copy, how-to copy | 4, 10, 11 |
| `css/styles.css` | `.pko-card-alpha` (crown + glow), `.pko-carrion-bar` (countdown) | 9, 10 |
| `tools/verify-pko-chain.js` | Data-layer: entry count, Mimic shape, Pool exclusion | 1 |
| `tools/verify-pko-loop.js` | Turn loop: **add** joint-winner scoring coverage | 3 |
| `tools/verify-pko-events.js` | **NEW** — every Force of Nature rule (§15's nine check groups) | 4–10 |
| `docs/**` | Documentation Integrity Protocol closure (§19) | 12 |

`pko.js` is already 1935 lines. It stays one file: the project's convention is one plugin per game, every plugin is global-scope, and splitting it would need a new `<script>` tag, a new SW precache entry, and a load-order decision for no benefit. New code goes in clearly-headed sections (`// ── Force of Nature ───`), placed next to the seam it extends.

---

## Task 1: The Mimic enters the data layer

The card exists as art and as a Pool guard; it has never existed as data. This task adds the entry and proves it stays out of a non-Sylly Pool. Nothing in the game can deal it yet — `force_of_nature_only` is already honoured at `pko.js:188`.

**Files:**
- Modify: `data/pko-data.json` (append 15th entry)
- Modify: `tools/verify-pko-chain.js:81` (entry count) + new section
- Modify: `sw.js:4` (`CACHE_NAME`)

**Interfaces:**
- Consumes: nothing.
- Produces: chain id `'mimic'` present in `pkoChain`, absent from `pkoBuildPool(n)` output for every n. Later tasks rely on `PKO_MIMIC_ID === 'mimic'` and on `pkoChain.mimic.track === 'wild'` (which makes `pkoTrackOk` reject a lone Mimic under a track lock for free).

- [ ] **Step 1: Write the failing checks**

Append to `tools/verify-pko-chain.js`, immediately before the closing `console.log('\n' + '='.repeat(48));` block:

```js
  section('The Mimic (Force of Nature — spec §10)');
  const mimic = pkoChain.mimic;
  check('the Mimic entry exists', !!mimic, true);
  check('it is force_of_nature_only', !!(mimic && mimic.force_of_nature_only), true);
  check('track is wild — so a track lock can never let a lone Mimic act',
    mimic && mimic.track, 'wild');
  check('beaten_by is empty — a Mimic never becomes a Mark, so nothing beats it',
    mimic && mimic.beaten_by, []);
  check('copy_formula is 2n — the exact mirror of the Poacher’s solo-only n',
    mimic && mimic.copy_formula, '2n');
  check('it is NOT ranked by Small Fry (a Hoard of Mimics + one Mouse opens with the Mouse)',
    sandbox.PKO_PREY_RANK === undefined || !('mimic' in (sandbox.PKO_PREY_RANK || {})), true);
  section('The Mimic never reaches a standard Pool');
  for (const n of [3, 4, 5, 6]) {
    check(`n=${n} → zero Mimics in the Pool`, pkoBuildPool(n).filter(c => c === 'mimic').length, 0);
  }
  check('Pool totals are unchanged by the new entry — 110/146/183/219',
    [3, 4, 5, 6].map(n => pkoBuildPool(n).length), [110, 146, 183, 219]);
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node tools/verify-pko-chain.js
```
Expected: FAIL on `the Mimic entry exists` (expected `true`, got `false`) and the four checks that read `mimic.*`. The entry-count check at line 81 still PASSES at this point.

- [ ] **Step 3: Add the data entry**

Append to `data/pko-data.json` — a new line after the Poacher (`human`) line, *before* the closing `]`. Keep the file's one-entry-per-line format; add a blank line before it so the Mimic reads as its own group, matching the land/sea separation already in the file. Order matters beyond style: `pkoSortHoard` orders a player's fan by `Object.keys(pkoChain)`, so appending last puts Mimics at the right-hand end of the fan, past the Poacher.

```json

{"id":"mimic","name":"Mimic","emoji":"🎭","track":"wild","beaten_by":[],"reach_beaten_by":[],"special":"copycat","copy_formula":"2n","force_of_nature_only":true}
```

(The spec's §10 snippet omits `special`; every other entry carries the key, so include it as `"copycat"` for schema uniformity. Nothing reads it — `special` is documentation in this data file.)

- [ ] **Step 4: Fix the entry-count check**

In `tools/verify-pko-chain.js:81`, replace:

```js
  check('14 entries (Mimic is Phase 2 — spec §17 D8)', ids.length, 14);
```
with:
```js
  check('15 entries (the Mimic landed with Force of Nature — FoN spec §10)', ids.length, 15);
```

- [ ] **Step 5: Run the chain harness to verify it passes**

```bash
node tools/verify-pko-chain.js
```
Expected: PASS on every check, `ALL CHECKS PASSED`, exit 0. If `it is NOT ranked by Small Fry` fails, someone added `mimic` to `PKO_PREY_RANK` — remove it; §10 is explicit that the rank table is not extended.

- [ ] **Step 6: Run the loop harness to prove no regression**

```bash
node tools/verify-pko-loop.js
```
Expected: `ALL CHECKS PASSED` (123 checks). The Mimic cannot reach a Hoard yet, so nothing here should move. If anything fails, stop — the entry has leaked into the Pool and `force_of_nature_only` is not being honoured.

- [ ] **Step 7: Bump the Service Worker**

`sw.js:4` — `const CACHE_NAME = 'sylly-games-v148';` → `'sylly-games-v149';`

Do **not** touch `PRECACHE_URLS`. Per Spec Correction C2, `data/art/pko/img/mimic.jpg` is already listed at line 61 and already on disk at 25 KB.

- [ ] **Step 8: Commit**

```bash
git add data/pko-data.json tools/verify-pko-chain.js sw.js
git commit -m "feat(pko): add the Mimic to the chain data; SW v149

The force_of_nature_only guard at pko.js:188 was written for a card that
was never authored. Art and precache entry already shipped (v148).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Extract the private-hand repair packet

`pkoRemoveFromHoard()` currently owns the `PKO_HAND_SYNC` send. Three Force of Nature events (The Culling, Extinction, Migration) change Hoards **without removing a played card**, so the send must live in a function that means "this Hoard changed" rather than "a card was played". This is BUG-02's exact class, and **TG-07 means no harness can catch it** — a single-process harness runs in `'single'` mode where `pkoMyHoard` *aliases* `pkoHoards[0]`, so per-device mirror bugs are structurally invisible. The protection is the refactor's shape, not a test.

**Files:**
- Modify: `js/games/pko.js:1099-1115` (`pkoRemoveFromHoard`), `js/games/pko.js:1215-1224` (the Scavenge draw inside `pkoApplyRetreat`)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `pkoSyncHand(playerIdx)` → void, and `pkoSyncAllHands()` → void. Tasks 6 and 7 call `pkoSyncAllHands()` after every mutating event; Task 7 calls `pkoSyncHand(i)` after the Invasive Mimicry bonus draw.

- [ ] **Step 1: Extract the two functions**

Replace `js/games/pko.js:1099-1115` (the comment block plus `pkoRemoveFromHoard`) with:

```js
// Cards leave the host's authoritative mirror here — and the owning DEVICE has to be
// told, or its fan keeps rendering cards it no longer holds. PKO_BOARD carries counts
// only (contents never touch the public channel), so the repair goes down the private
// channel as the player's WHOLE hand, not a delta: a full replacement is self-correcting
// if a packet is ever missed. Without this a client's pkoMyHoard was only ever written
// by the initial deal, so every card it played stayed in its fan and every attempt to
// replay one was silently dropped by pkoHoldsAll() on the host (BUG-02).
//
// The SEND is deliberately its own function rather than living inside
// pkoRemoveFromHoard: Force of Nature's Culling, Extinction and Migration all change a
// Hoard without a card being played, and a repair keyed to "a card was played" would
// miss all three. pkoSyncHand means "this Hoard changed" — the only precondition that
// is actually true at every call site.
function pkoSyncHand(playerIdx) {
  const hoard = pkoHoards[playerIdx] || [];
  pkoHoardCounts[playerIdx] = hoard.length;
  if (playerIdx === pkoMyIdx()) { pkoMyHoard = hoard; return; }   // host's own seat — aliased, nothing to send
  const uid = mpPlayerSlots[playerIdx] && mpPlayerSlots[playerIdx].uid;
  if (uid && window.syllyMultiplayerMode !== 'single') {
    mpSendPrivate(uid, { type: 'SYNC', payload: { action: 'PKO_HAND_SYNC', cards: hoard } });
  }
}
function pkoSyncAllHands() {
  for (let i = 0; i < pkoPlayerCount; i++) pkoSyncHand(i);
}

function pkoRemoveFromHoard(playerIdx, cards) {
  const hoard = pkoHoards[playerIdx];
  cards.forEach(c => { const i = hoard.indexOf(c); if (i !== -1) hoard.splice(i, 1); });
  pkoSyncHand(playerIdx);
}
```

- [ ] **Step 2: Route the Scavenge draw through it too**

The Scavenge branch in `pkoApplyRetreat` (`pko.js:1215-1224`) hand-rolls the same count-update and sends `PKO_DRAW` (a single-card delta, not a whole hand). Leave `PKO_DRAW` — its client handler appends one card and the delta is correct there — but stop duplicating the count bookkeeping. Replace the body of the `if (pkoScavenge && pkoReserve.length)` block with:

```js
  if (pkoScavenge && pkoReserve.length) {
    const card = pkoReserve.shift();
    pkoHoards[playerIdx].push(card);
    const uid = mpPlayerSlots[playerIdx] && mpPlayerSlots[playerIdx].uid;
    pkoSyncHand(playerIdx);                     // count + host-seat alias, one place
    if (playerIdx !== pkoMyIdx() && uid && window.syllyMultiplayerMode !== 'single') {
      mpSendPrivate(uid, { type: 'SYNC', payload: { action: 'PKO_DRAW', card } });
    }
  }
```

Note this now sends **both** `PKO_HAND_SYNC` (whole hand, from `pkoSyncHand`) and `PKO_DRAW` (the one card) to a scavenging client. That is intentional redundancy in the self-correcting direction — the whole-hand packet is authoritative and idempotent, and `PKO_DRAW`'s `pkoMyHoard.push(p.card)` is order-independent against it. If the two ever disagree, the next `pkoSyncHand` corrects it.

- [ ] **Step 3: Verify no other site writes `pkoHoardCounts` by hand**

```bash
grep -n "pkoHoardCounts\[" js/games/pko.js
```
Expected: zero hits. Every per-seat count write now goes through `pkoSyncHand`. (`pkoHoardCounts = pkoHoards.map(...)` in `pkoStartClash` is a whole-array rebuild and is fine — it is a different operation and it precedes `pkoSendPrivateHands()`.)

- [ ] **Step 4: Run both harnesses**

```bash
node tools/verify-pko-chain.js && node tools/verify-pko-loop.js
```
Expected: both `ALL CHECKS PASSED`. This is a pure extraction — 58 + 123 checks, no number moves. If a count check fails, `pkoSyncHand` is being called before the splice rather than after.

- [ ] **Step 5: Commit**

```bash
git add js/games/pko.js
git commit -m "refactor(pko): extract pkoSyncHand/pkoSyncAllHands from pkoRemoveFromHoard

Force of Nature's Culling, Extinction and Migration change Hoards without
a card being played. The private repair packet has to key on 'this Hoard
changed', not 'a card was played' — logic-engine.md ML-06, BUG-02's class.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Multi-winner Clash resolution

Extinction Event can empty several Hoards at once, so `pkoResolveClash` takes an array. This is the breaking change; doing it before any event exists keeps it a pure, separately-reviewable refactor with the existing 123 checks as its safety net.

**Files:**
- Modify: `js/games/pko.js:1320-1370` (`pkoResolveClash`, `pkoShowClashResult`), `:1374-1396` (`pkoBuildStandings`), `:1143-1154` (`pkoAfterBoardChange` — the one existing call site), `:1572-1592` (the two SYNC handlers)
- Modify: `tools/verify-pko-loop.js` (add joint-winner section)
- Modify: `docs/code-map.md:1740`, `docs/new-game-tech-pecking-order.md:234` (signature in prose)

**Interfaces:**
- Consumes: nothing.
- Produces: `pkoResolveClash(winnerIdxs)` where `winnerIdxs` is `int[]` (a bare int is tolerated defensively but never passed by shipped code); `pkoNextOpener(winnerIdxs)` → `int`. Task 6's Extinction `onFire` is the only new caller. `PKO_CLASH_END` and `PKO_MATCH_END` carry `winnerIdxs[]`.

- [ ] **Step 1: Write the failing checks**

Append to `tools/verify-pko-loop.js`, immediately before the final `console.log('\n' + '='.repeat(48));`:

```js
  section('Joint Clash resolution (FoN §6 — Extinction can empty several Hoards)');
  P.seat({ hoards: [['bee'], ['mouse'], ['fish'], ['eagle']], turn: 0, scores: [0, 0, 0, 0] });
  P.set('clashTarget', 3);
  pkoResolveClash([1, 3]);
  check('every winner scores', P.scores, [0, 1, 0, 1]);
  check('one history row, multiple 1s', P.history, [[0, 1, 0, 1]]);
  check('the next opener is one OF the winners', [1, 3].includes(P.leader), true);
  check('the clash-result screen is shown', screens.pop(), 'screen-pko-clash-result');

  section('Joint Match end — they all win together (brief §4)');
  P.seat({ hoards: [['bee'], ['mouse'], ['fish'], ['eagle']], turn: 0, scores: [0, 2, 0, 2] });
  P.set('clashTarget', 3);
  pkoResolveClash([1, 3]);
  check('both cross the target on the same Clash', P.scores, [0, 3, 0, 3]);
  check('the Hierarchy is shown, not the clash result', screens.pop(), 'screen-pko-hierarchy');

  section('Next opener among joint winners prefers the most Match points');
  P.seat({ hoards: [['bee'], ['mouse'], ['fish'], ['eagle']], turn: 0, scores: [0, 0, 0, 4] });
  P.set('clashTarget', 99);
  pkoResolveClash([1, 3]);
  check('the winner with more Match points opens the next Clash', P.leader, 3);

  section('A single winner is unchanged — the array is the only difference');
  P.seat({ hoards: [['bee'], ['mouse'], ['fish'], ['eagle']], turn: 0, scores: [0, 0, 0, 0] });
  P.set('clashTarget', 99);
  pkoResolveClash([2]);
  check('one winner scores once', P.scores, [0, 0, 1, 0]);
  check('the single winner leads the next Clash', P.leader, 2);
  check('history row has exactly one 1', P.history, [[0, 0, 1, 0]]);
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node tools/verify-pko-loop.js
```
Expected: FAIL — `every winner scores` gets `[0,0,0,0]` (the current `pkoScores[winnerIdx]++` with an array index is a silent no-op, which is precisely why this must be caught by a test rather than by reading).

- [ ] **Step 3: Rewrite `pkoResolveClash` and add `pkoNextOpener`**

Replace `js/games/pko.js:1319-1345` with:

```js
// Which of several joint winners opens the next Clash: most Match points, then random
// (brief §5). With one winner it is that winner — the shipped behaviour, unchanged.
function pkoNextOpener(winnerIdxs) {
  if (winnerIdxs.length === 1) return winnerIdxs[0];
  const best = Math.max(...winnerIdxs.map(i => pkoScores[i] || 0));
  const tied = winnerIdxs.filter(i => (pkoScores[i] || 0) === best);
  return tied[Math.floor(Math.random() * tied.length)];
}

// Host: a point enters the game only by emptying a Hoard — but Extinction Event can empty
// SEVERAL at once, so this takes an array. One point per emptied Hoard, one history row per
// Clash with a 1 in every winning column, and if more than one player crosses the target on
// the same Clash they win the Match jointly (brief §4: "they all win together").
function pkoResolveClash(winnerIdxs) {
  if (window.syllyMultiplayerMode === 'client') return;
  // Defensive unwrap: a bare int would silently no-op on pkoScores[[0]]++ rather than throw.
  const winners = (Array.isArray(winnerIdxs) ? winnerIdxs : [winnerIdxs])
    .filter(i => i >= 0 && i < pkoPlayerCount).sort((a, b) => a - b);
  if (!winners.length) return;

  winners.forEach(i => pkoScores[i]++);
  pkoClashHistory.push(pkoPlayerNames.map((_, i) => (winners.includes(i) ? 1 : 0)));
  pkoLeaderIdx = pkoNextOpener(winners);
  const names = winners.map(i => pkoPlayerNames[i]);
  pkoLogTrail(winners.length === 1
    ? `${names[0]} emptied their Hoard and took the Clash.`
    : `${names.join(' and ')} emptied their Hoards and took the Clash together.`);
  playClashWin();

  if (winners.some(i => pkoScores[i] >= pkoClashTarget)) {
    if (window.syllyMultiplayerMode !== 'single') {
      mpSendEnvelope({ type: 'SYNC', payload: {
        action: 'PKO_MATCH_END', finalScores: pkoScores, clashHistory: pkoClashHistory,
        playerNames: pkoPlayerNames, winnerIdxs: winners,
      }});
    }
    pkoShowHierarchy();
    return;
  }
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'PKO_CLASH_END', winnerIdxs: winners, scores: pkoScores,
      clashHistory: pkoClashHistory, clashNum: pkoClashNum, trail: pkoTrail,
    }});
  }
  pkoShowClashResult(winners);
}
```

- [ ] **Step 4: Update the one existing call site**

`js/games/pko.js:1146`, inside `pkoAfterBoardChange`:

```js
  if ((pkoHoards[playerIdx] || []).length === 0) { pkoResolveClash([playerIdx]); return; }
```

Confirm it is the only one:
```bash
grep -n "pkoResolveClash" js/games/pko.js
```
Expected: the definition, the `pkoAfterBoardChange` call, and nothing else.

- [ ] **Step 5: Teach the result screen and the Hierarchy about joint winners**

Replace `pkoShowClashResult`'s signature and heading (`js/games/pko.js:1347-1362`):

```js
function pkoShowClashResult(winnerIdxs) {
  const winners = Array.isArray(winnerIdxs) ? winnerIdxs : [winnerIdxs];
  showScreen('screen-pko-clash-result');
  const num = document.getElementById('pko-clash-result-num');
  if (num) num.textContent = `Clash ${pkoClashNum} Summary`;
  const body = document.getElementById('pko-clash-result-body');
  if (body) {
    body.innerHTML = '';
    const emoji = document.createElement('div');
    emoji.className = 'text-5xl'; emoji.textContent = '🐘';
    const head = document.createElement('h2');
    head.className = 'text-2xl font-bold text-stone-800';
    const names = winners.map(i => pkoPlayerNames[i]);
    head.textContent = names.length === 1
      ? `${names[0]} takes the Clash`
      : `${names.join(' & ')} share the Clash`;
    const sub = document.createElement('p');
    sub.className = 'text-stone-400 text-sm';
    sub.textContent = names.length === 1 ? 'They lead the next one.' : 'One of them leads the next one.';
    body.append(emoji, head, sub, pkoBuildStandings());
  }
```
(The host-gate block below it — `btn-pko-next-clash` / `pko-clash-result-waiting` — is unchanged.)

In `pkoBuildStandings` (`js/games/pko.js:1379-1392`), replace the two "top and bottom of the pile" lines so **every** player on the top score is named Apex Predator, not just the first row drawn:

```js
  const top = order.length ? order[0].s : 0;
  order.forEach((p, pos) => {
    const rank = order.findIndex(q => q.s === p.s) + 1;   // ties share a rank
```
…and inside the loop, replace:
```js
    if (pos === 0 && p.s > 0)                      left.textContent += ' — Apex Predator';
    else if (pos === order.length - 1 && p.s === 0) left.textContent += ' — Bottom Feeder';
```
with:
```js
    // Joint Apex Predator: equal top scores share rank 1, so they share the title too —
    // there is no arbitrary ordering to break the tie with (FoN §6).
    if (p.s === top && p.s > 0)                     left.textContent += ' — Apex Predator';
    else if (pos === order.length - 1 && p.s === 0) left.textContent += ' — Bottom Feeder';
```

- [ ] **Step 6: Update the two SYNC handlers**

`js/games/pko.js:1572-1592`. In `case 'PKO_CLASH_END':` replace `pkoShowClashResult(p.winnerIdx);` with:

```js
      pkoShowClashResult(p.winnerIdxs || (p.winnerIdx === undefined ? [] : [p.winnerIdx]));
```

`case 'PKO_MATCH_END':` needs no change — it reads `finalScores` and calls `pkoShowHierarchy()`, both already multi-winner-safe after Step 5.

- [ ] **Step 7: Run both harnesses**

```bash
node tools/verify-pko-chain.js && node tools/verify-pko-loop.js
```
Expected: chain 58/58, loop `ALL CHECKS PASSED` with the 11 new joint-winner checks green **and all 123 originals still green**. Per Spec Correction C4, no existing check should have needed editing — if one did, stop and work out why the array signature reached it.

- [ ] **Step 8: Correct the signature in the two docs**

`docs/code-map.md:1740`:
```
| `pkoResolveClash(winnerIdxs)` | +1 point per winner, push one `pkoClashHistory` row with a 1 per winner, decide Clash-end vs Match-end (joint winners share the Match) |
```
`docs/new-game-tech-pecking-order.md:234`:
```
**Scoring function:** `pkoResolveClash(winnerIdxs)` — increments `pkoScores` for every winner, pushes one row onto `pkoClashHistory`, decides Clash-vs-Match end. Took a single index until Force of Nature; Extinction Event can empty several Hoards at once.
```

- [ ] **Step 9: Commit**

```bash
git add js/games/pko.js tools/verify-pko-loop.js docs/code-map.md docs/new-game-tech-pecking-order.md
git commit -m "feat(pko): pkoResolveClash takes an array of winners

Extinction Event can empty several Hoards at once. Joint winners share the
Clash, one of them opens the next, and a joint target crossing wins the
Match together. Adds pkoNextOpener; Apex Predator is now shared on ties.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: The event registry, the draw gate, and the interstitial

The scaffolding every later task hangs off: the `PKO_EVENTS` data array, the state variables, `pkoDrawEvent()` with its `canFire()` gate, and `screen-pko-event`. At the end of this task Force of Nature draws events and shows them — every event's *effect* is still inert, which is deliberate: it isolates the draw gate as its own reviewable deliverable and gives Tasks 5–9 a working harness to extend.

**Files:**
- Modify: `js/games/pko.js` (new state at ~line 69; new `// ── Force of Nature ───` section after `pkoBuildPool`, which ends line 203; `pkoStartClash`; `pkoStartEncounter`; `pkoResetState`; the quit-confirm handler; two SYNC handlers)
- Modify: `js/engine.js:80-81` (`allScreens[]`)
- Modify: `index.html` (new `screen-pko-event` after `screen-pko-unchallenged`, which ends at line 8662)
- Create: `tools/verify-pko-events.js`

**Interfaces:**
- Consumes: `pkoResolveClash(winnerIdxs)` (Task 3).
- Produces:
  - `PKO_EVENTS` — `Array<{ id, name, emoji, blurb, canFire, onFire, track, reversal, alpha, carrion }>`
  - `pkoEventFlag(key)` → the active event's value for `key`, else `null`
  - `pkoCanActUnderTrack(hoard, track)` → bool
  - `pkoDrawEvent()` → void; sets `pkoEvent` (`string|null`) and pushes onto `pkoEventsFired`
  - `pkoShowEvent(eventId, then)` → void; `then` is a zero-arg callback fired after `PKO_EVENT_SCREEN_MS`
  - **`onFire()` contract: returns `int[]` of seats whose Hoard it emptied (`[]` when none).** Tasks 6 implements three of these against exactly this signature.
  - State: `pkoEvent`, `pkoEventsFired`, `pkoAlphaIdx`, `pkoCarrionSel`, `pkoEventTimer`, `pkoCarrionTimer`

- [ ] **Step 1: Add the state variables and constants**

In `js/games/pko.js`, after `let pkoUnchallengedTimer = null;` (line 69):

```js
// ── Force of Nature (Sylly Mode) state ────────────────────────────────────
let pkoEvent          = null;         // active event id for this Encounter, or null
let pkoEventsFired    = [];           // ids fired this Clash — ACCUMULATOR, resets in-payload
let pkoAlphaIdx       = -1;           // index into pkoMarks; -1 = no Alpha
let pkoCarrionSel     = [];           // device-local Mark indices selected to keep
let pkoEventTimer     = null;         // interstitial auto-advance (cleared in 3 places)
let pkoCarrionTimer   = null;         // Carrion window (cleared in 3 places)
```

After `const PKO_PREY_RANK = {...};` (ends line 87):

```js
const PKO_MIMIC_ID           = 'mimic';
const PKO_FON_DEAL_BONUS_DIV = 4;      // bonus = round(pkoHoardSize / 4) → 3 / 3 / 4
const PKO_CARRION_WINDOW_MS  = 5000;   // first playtest dial — FoN spec §17 D31
const PKO_EVENT_SCREEN_MS    = 2500;   // matches screen-pko-unchallenged
```

- [ ] **Step 2: Add the registry, the flag reader, and the draw gate**

New section in `js/games/pko.js`, immediately after `pkoBuildPool` (ends line 203) so it sits with the other rules data rather than in the middle of rendering:

```js
// ── Force of Nature — the event registry ──────────────────────────────────
// Plain data. A MUTATING event owns an onFire() that runs host-side on an empty board
// and returns the seats it emptied; a PASSIVE event sets a flag that an existing
// single-source predicate reads, so no new branch appears at any call site.
// canFire() is checked against host state BEFORE the event is committed — that gate is
// what deletes the brief's Deluge/Dry Season skip loop rather than capping it (D34).
const PKO_EVENTS = [
  { id: 'invasive-mimicry', name: 'Invasive Mimicry', emoji: '🎭',
    blurb: 'Mimics have infiltrated the Pool. Everyone draws a few more cards.',
    canFire: null, onFire: null, track: null, reversal: false, alpha: false, carrion: false },
  { id: 'culling', name: 'The Culling', emoji: '🍂',
    blurb: 'The season takes the rarest species from every Hoard.',
    canFire: null, onFire: () => pkoFireCulling(), track: null, reversal: false, alpha: false, carrion: false },
  { id: 'great-reversal', name: 'The Great Reversal', emoji: '🔄',
    blurb: 'The chain runs backwards. Prey becomes predator.',
    canFire: null, onFire: null, track: null, reversal: true, alpha: false, carrion: false },
  { id: 'deluge', name: 'The Deluge', emoji: '🌊',
    blurb: 'The waters rise — only the sea may hunt.',
    canFire: () => pkoHoards.some(h => pkoCanActUnderTrack(h, 'sea')),
    onFire: null, track: 'sea', reversal: false, alpha: false, carrion: false },
  { id: 'dry-season', name: 'The Dry Season', emoji: '☀️',
    blurb: 'The water is gone — only the land may hunt.',
    canFire: () => pkoHoards.some(h => pkoCanActUnderTrack(h, 'land')),
    onFire: null, track: 'land', reversal: false, alpha: false, carrion: false },
  { id: 'extinction', name: 'Extinction Event', emoji: '☄️',
    blurb: 'The rarest species in the whole wild is wiped out entirely.',
    canFire: () => !pkoEventsFired.includes('extinction'),
    onFire: () => pkoFireExtinction(), track: null, reversal: false, alpha: false, carrion: false },
  { id: 'migration', name: 'Migration', emoji: '🧭',
    blurb: 'Every Hoard moves one seat to the left.',
    canFire: null, onFire: () => pkoFireMigration(), track: null, reversal: false, alpha: false, carrion: false },
  { id: 'alpha', name: 'Alpha', emoji: '👑',
    blurb: 'One Mark is the Alpha. Nothing played against it is discarded.',
    canFire: null, onFire: null, track: null, reversal: false, alpha: true, carrion: false },
  { id: 'carrion', name: 'Carrion', emoji: '🦅',
    blurb: 'The spoils of a kill may be taken back into your Hoard.',
    canFire: null, onFire: null, track: null, reversal: false, alpha: false, carrion: true },
];

// The active event's value for one key, or null when no event is live. Every Force of
// Nature branch reads through here — an effect is never tested by comparing pkoEvent to a
// string at a call site, so adding an event never edits a seam.
function pkoEventFlag(key) {
  if (!pkoEvent) return null;
  const e = PKO_EVENTS.find(x => x.id === pkoEvent);
  return e ? (e[key] || null) : null;
}

// Can this player act at all under a track lock? ONE definition, two consumers —
// canFire() and the Leader pass — which must never disagree, or an event fires that
// nobody can answer. A Poacher always qualifies; a lone Mimic never does (its track is
// 'wild', so it can only ride along with a real card of the locked track).
function pkoCanActUnderTrack(hoard, track) {
  return (hoard || []).some(c =>
    c === PKO_POACHER_ID || (((pkoChain && pkoChain[c]) || {}).track === track));
}

// Draw the Encounter's event. GATE, never redraw: an event canFire() rejects is simply
// not in the pool, so there is no skip, no re-roll, no loop and no cap to tune (D34).
// pkoEvent = null (nothing eligible) is a legal outcome — the Encounter then runs under
// standard rules with no interstitial.
function pkoDrawEvent() {
  const pool = PKO_EVENTS.filter(e =>
       e.id !== 'invasive-mimicry'
    && (!e.canFire || e.canFire()));
  pkoEvent = pool.length ? pool[Math.floor(Math.random() * pool.length)].id : null;
  if (pkoEvent) pkoEventsFired.push(pkoEvent);
}
```

Extinction's once-per-Clash gate lives in its own `canFire`, not as a hardcoded clause in `pkoDrawEvent` (as the spec's §8 snippet has it) — otherwise a second once-per-Clash event would need a second hardcoded clause.

- [ ] **Step 3: Add the interstitial and its sound map**

Directly after `pkoShowUnchallenged` (ends line 1317), so the two interstitials sit together:

```js
// Which sound each event announces itself with. No new synthesised functions — §13
// reuses the catalogue, and the mapping lives in one place so an event's identity
// (data) and its voice (audio) cannot drift apart.
const PKO_EVENT_SOUND = {
  'invasive-mimicry': 'playPoacher',   // out-of-ecosystem, like the Poacher itself
  'culling':          'playAbyssThud',
  'extinction':       'playAbyssThud',
  'great-reversal':   'playWhoosh',
  'migration':        'playWhoosh',
  'alpha':            'playSonarPing',
  'carrion':          'playSonarPing',
  'deluge':           'playDone',
  'dry-season':       'playDone',
};

// The event interstitial. Unlike screen-pko-unchallenged, BOTH sides schedule their own
// advance: after this screen the table renders from already-synced state, so no host
// decision is pending. There (§11) the advance STARTS the next Encounter, which IS a
// host decision, so only the host may time it.
function pkoShowEvent(eventId, then) {
  const e = PKO_EVENTS.find(x => x.id === eventId);
  if (!e) { then(); return; }
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set('pko-event-emoji', e.emoji);
  set('pko-event-name',  e.name);
  set('pko-event-blurb', e.blurb);
  const snd = globalThis[PKO_EVENT_SOUND[e.id] || 'playDone'];
  if (typeof snd === 'function') snd();
  showScreen('screen-pko-event');
  if (pkoEventTimer) clearTimeout(pkoEventTimer);
  pkoEventTimer = setTimeout(() => { pkoEventTimer = null; then(); }, PKO_EVENT_SCREEN_MS);
}
```

- [ ] **Step 4: Wire the draw into `pkoStartEncounter`**

Replace `js/games/pko.js:462-480` entirely:

```js
// Host: open a new Encounter. The leader faces an empty board and must Stake.
// Under Force of Nature the event is drawn FIRST, because a mutating event runs against
// an empty board and may end the Clash outright before a card is ever played (§6).
function pkoStartEncounter() {
  if (window.syllyMultiplayerMode === 'client') return;
  pkoEncounterNum++;
  pkoMarks          = [];
  pkoMarkOwnerIdx   = -1;
  pkoAlphaIdx       = -1;
  pkoTurnIdx        = pkoLeaderIdx;
  pkoRetreatedSince = new Array(pkoPlayerCount).fill(false);

  // Encounter 1's event is Invasive Mimicry, already set AND already applied by
  // pkoStartClash — it mutates the DEAL, so it cannot wait until here (§9).
  if (pkoSyllyMode && pkoEncounterNum > 1) pkoDrawEvent();
  const ev = pkoEvent && PKO_EVENTS.find(x => x.id === pkoEvent);
  if (ev && ev.onFire) {
    const emptied = ev.onFire() || [];
    if (emptied.length) { pkoResolveClash(emptied); return; }   // Clash over before a card is played
  }
  // Track lock: the Leader may be unable to open, so the Stake passes clockwise to the
  // first player who can. This does NOT transfer leadership — the next Encounter's
  // leader is still whoever goes Unchallenged (§7.3).
  const lock = pkoEventFlag('track');
  if (lock) {
    for (let s = 0; s < pkoPlayerCount; s++) {
      const i = (pkoLeaderIdx + s) % pkoPlayerCount;
      if (pkoCanActUnderTrack(pkoHoards[i] || [], lock)) { pkoTurnIdx = i; break; }
    }
  }

  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'PKO_ENCOUNTER_BEGIN',
      encounterNum: pkoEncounterNum, leaderIdx: pkoLeaderIdx, turnIdx: pkoTurnIdx,
      marks: pkoMarks, markOwnerIdx: pkoMarkOwnerIdx,
      retreatedSince: pkoRetreatedSince, hoardCounts: pkoHoardCounts,
      wateringHole: pkoWateringHole, trail: pkoTrail,
      event: pkoEvent, eventsFired: pkoEventsFired, alphaIdx: pkoAlphaIdx,
    }});
  }
  if (pkoEvent) pkoShowEvent(pkoEvent, pkoShowTable);
  else pkoShowTable();
}
```

`hoardCounts` was already in this payload and now also carries `onFire`'s mutations, because `pkoSyncAllHands()` (Task 2) updates `pkoHoardCounts` before this send. `trail` is newly added so an event's own Trail lines reach clients.

- [ ] **Step 5: Handle the new payload fields on the client side**

`js/games/pko.js`, `case 'PKO_ENCOUNTER_BEGIN':` (line 1526). Add the timer cancel alongside the existing one at the top of the case:
```js
      if (pkoEventTimer) { clearTimeout(pkoEventTimer); pkoEventTimer = null; }
```
Add after `pkoWateringHole = p.wateringHole || pkoWateringHole;`:
```js
      pkoTrail          = p.trail || pkoTrail;
      pkoEvent          = p.event === undefined ? null : p.event;
      pkoEventsFired    = p.eventsFired || [];     // accumulator — trust the payload, never carry forward
      pkoAlphaIdx       = p.alphaIdx === undefined ? -1 : p.alphaIdx;
```
Replace `pkoShowTable();` in that case with:
```js
      if (pkoEvent) pkoShowEvent(pkoEvent, pkoShowTable);
      else pkoShowTable();
```

- [ ] **Step 6: Reset the accumulator at Clash start — both sides**

In `pkoStartClash` (`js/games/pko.js:379-415`), after `pkoEncounterNum = 0;`:
```js
  pkoEvent       = null;
  pkoEventsFired = [];
  pkoAlphaIdx    = -1;
```
Add to the `PKO_CLASH_BEGIN` payload, alongside the other reset accumulators:
```js
      event: pkoEvent, eventsFired: pkoEventsFired, alphaIdx: pkoAlphaIdx,
```
In `case 'PKO_CLASH_BEGIN':` (line 1501), after `pkoWateringHole = p.wateringHole || [];`:
```js
      pkoEvent       = p.event === undefined ? null : p.event;
      pkoEventsFired = p.eventsFired || [];        // reset value travels explicitly (ML-03)
      pkoAlphaIdx    = p.alphaIdx === undefined ? -1 : p.alphaIdx;
```

- [ ] **Step 7: Register the screen and clear the timers in all three places**

`js/engine.js:80-81` — add `'screen-pko-event'` to `allScreens[]`:
```js
  'screen-pko-menu', 'screen-pko-hoard', 'screen-pko-table', 'screen-pko-event',
  'screen-pko-unchallenged', 'screen-pko-clash-result', 'screen-pko-hierarchy',
```

`js/games/pko.js`, `pkoResetState()` (line 1604) — extend the head of the function:
```js
function pkoResetState() {
  if (pkoUnchallengedTimer) { clearTimeout(pkoUnchallengedTimer); pkoUnchallengedTimer = null; }
  if (pkoEventTimer)        { clearTimeout(pkoEventTimer);        pkoEventTimer = null; }
  if (pkoCarrionTimer)      { clearTimeout(pkoCarrionTimer);      pkoCarrionTimer = null; }
  pkoEvent = null; pkoEventsFired = []; pkoAlphaIdx = -1; pkoCarrionSel = [];
```
(the rest of the function is unchanged)

`js/games/pko.js`, the quit-confirm handler (line 1903) — add both handles beside the existing cancel:
```js
    if (pkoEventTimer)   { clearTimeout(pkoEventTimer);   pkoEventTimer = null; }
    if (pkoCarrionTimer) { clearTimeout(pkoCarrionTimer); pkoCarrionTimer = null; }
```

- [ ] **Step 8: Add the screen markup**

`index.html` — insert after `screen-pko-unchallenged`'s closing `</section>` (line 8662), before the `<!-- PKO CLASH RESULT -->` comment. It is the Stack, and it takes the **interstitial exception** (`ui-style.md` § Global UI Protocol item 5): it auto-advances at 2.5 s with no interactive element, exactly like `screen-pko-unchallenged`, so it carries no `[?]`/🔊/✕ chrome.

```html
  <!-- PKO FORCE OF NATURE EVENT (interstitial — auto-advances, no chrome: ui-style item 5) -->
  <section id="screen-pko-event" style="display:none"
    class="flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">
    <div class="flex flex-col w-full max-w-sm gap-4 text-center items-center">
      <div id="pko-event-emoji" class="text-6xl" role="img" aria-label="Force of Nature event">🌿</div>
      <div>
        <p class="text-xs font-semibold uppercase tracking-widest pko-label">Force of Nature</p>
        <h2 id="pko-event-name" class="text-3xl font-bold text-stone-800 mt-1">—</h2>
        <p id="pko-event-blurb" class="text-stone-400 text-sm mt-2">—</p>
      </div>
    </div>
  </section>
```

- [ ] **Step 9: Create the events harness**

Create `tools/verify-pko-events.js`. Sandbox mirrors `verify-pko-loop.js` (same `vm` gotcha, same throwing `mpSendEnvelope`). A third file rather than an extension: the loop harness is already 123 checks and mixing event rules in obscures both.

```js
// ═══════════════════════════════════════════════════════════════════════════
// verify-pko-events.js — asserts Pecking Order's Force of Nature ruleset.
//
//   node tools/verify-pko-events.js        (exits 1 on any failure)
//
// Third harness. verify-pko-chain.js owns the DATA layer, verify-pko-loop.js the
// TURN LOOP, this one the EVENTS — draw gate, Mimic, reversal, track locks, and
// every mutating event's effect on the Hoards.
//
// Same vm gotcha as the other two: `let` in a vm-evaluated script creates a lexical
// binding, NOT a property on the context object, so state is invisible from out here.
// The appended bridge exposes it; `function` and `const` declarations DO land on the
// object, which is why PKO_EVENTS and the appliers are reachable directly.
//
// TG-07 STILL BINDS: this runs in 'single' mode where pkoMyHoard ALIASES pkoHoards[0],
// so it is structurally blind to per-device mirror bugs. It cannot prove the three new
// pkoSyncAllHands() senders reach a client. Only a non-host playtest can.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');
const chainJson = fs.readFileSync(path.join(ROOT, 'data/pko-data.json'), 'utf8');

const screens = [];
const timers  = [];
const sandbox = {
  console,
  document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
  window: { syllyMultiplayerMode: 'single' },
  fetch: () => Promise.resolve({ json: () => Promise.resolve(JSON.parse(chainJson)) }),
  shuffle: a => [...a],
  showScreen: id => screens.push(id),
  setTimeout: (fn, ms) => timers.push({ fn, ms }) - 1,
  clearTimeout: () => {},
  playLaunch() {}, playBoing() {}, playWhoosh() {}, playDone() {}, playPillClick() {},
  playSyllyOn() {}, playSyllyOff() {}, playStampede() {}, playUnchallenged() {},
  playPoacher() {}, playClashWin() {}, playSuccess() {}, playAbyssThud() {}, playSonarPing() {},
  mpSendEnvelope() { throw new Error('mpSendEnvelope called in single mode'); },
  mpSendPrivate()  { throw new Error('mpSendPrivate called in single mode'); },
  mpLockSync() {}, mpUnlockSync() {}, mpPlayerSlots: [],
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const BRIDGE = `
globalThis.__fon = {
  get event()       { return pkoEvent; },
  get fired()       { return pkoEventsFired; },
  get alpha()       { return pkoAlphaIdx; },
  get marks()       { return pkoMarks; },
  get hoards()      { return pkoHoards; },
  get counts()      { return pkoHoardCounts; },
  get scores()      { return pkoScores; },
  get watering()    { return pkoWateringHole; },
  get wateringFlat(){ return pkoWateringHole.flatMap(b => b.cards); },
  get trail()       { return pkoTrail; },
  get turn()        { return pkoTurnIdx; },
  get leader()      { return pkoLeaderIdx; },
  get reserve()     { return pkoReserve; },
  seat(o) {
    pkoPlayerCount = o.hoards.length;
    pkoPlayerNames = o.hoards.map((_, i) => 'P' + i);
    pkoHoards      = o.hoards.map(h => [...h]);
    pkoHoardCounts = pkoHoards.map(h => h.length);
    pkoMarks          = [...(o.marks || [])];
    pkoMarkOwnerIdx   = o.owner === undefined ? -1 : o.owner;
    pkoTurnIdx        = o.turn || 0;
    pkoRetreatedSince = new Array(pkoPlayerCount).fill(false);
    pkoScores         = o.scores || new Array(pkoPlayerCount).fill(0);
    pkoClashHistory = []; pkoWateringHole = []; pkoReserve = o.reserve || [];
    pkoTrail = []; pkoEncounterNum = o.encounter || 1; pkoClashNum = 1;
    pkoLeaderIdx = o.leader || 0;
    pkoStartSmall = 'off'; pkoAppetite = o.appetite || 'sated';
    pkoEvent = o.event === undefined ? null : o.event;
    pkoEventsFired = o.fired || [];
    pkoAlphaIdx = o.alphaIdx === undefined ? -1 : o.alphaIdx;
    pkoSyllyMode = o.sylly === undefined ? true : o.sylly;
    pkoMyHoard = pkoHoards[0];
  },
  set(k, v) {
    if (k === 'event')       pkoEvent = v;
    if (k === 'fired')       pkoEventsFired = [...v];
    if (k === 'alphaIdx')    pkoAlphaIdx = v;
    if (k === 'appetite')    pkoAppetite = v;
    if (k === 'sylly')       pkoSyllyMode = v;
    if (k === 'hoardSize')   pkoHoardSize = v;
    if (k === 'clashTarget') pkoClashTarget = v;
    if (k === 'marks')       pkoMarks = [...v];
    if (k === 'myHoard')     pkoMyHoard = [...v];
  },
  flag(k)        { return pkoEventFlag(k); },
  predators(id)  { return [...(pkoPredators(id) || [])].sort(); },
  beats(m, c)    { return pkoBeats(m, c); },
  answers(m, cs) { return pkoAnswers(m, cs); },
  canAct(h, t)   { return pkoCanActUnderTrack(h, t); },
  draw()         { pkoDrawEvent(); return pkoEvent; },
  events()       { return PKO_EVENTS.map(e => e.id); },
  // Runs the REAL pkoStartEncounter but pins the event, so the Leader pass and every
  // onFire can be tested against a chosen event instead of whatever the draw picked.
  // pkoDrawEvent is a function declaration, so it lands on the context and is
  // reassignable from in here — never try this from outside the vm.
  startWithEvent(id) {
    const real = pkoDrawEvent;
    pkoDrawEvent = () => { pkoEvent = id; pkoEventsFired.push(id); };
    try { pkoStartEncounter(); } finally { pkoDrawEvent = real; }
    return pkoTurnIdx;
  },
};`;
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/games/pko.js'), 'utf8') + BRIDGE, sandbox,
  { filename: 'js/games/pko.js' });

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}` +
    (ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}
const section = t => console.log(`\n${t}`);

(async () => {
  await sandbox.pkoLoadChain();
  const F = sandbox.__fon;

  console.log('Pecking Order — Force of Nature verification\n' + '='.repeat(48));

  section('The registry');
  check('nine events — eight random plus the fixed opener (§1)', F.events().length, 9);
  check('Dark Forest was cut (D26)', F.events().includes('dark-forest'), false);
  check('every event carries an id, name, emoji and blurb',
    sandbox.PKO_EVENTS.filter(e => !e.id || !e.name || !e.emoji || !e.blurb).map(e => e.id), []);
  check('no event is both mutating and passive',
    sandbox.PKO_EVENTS.filter(e => e.onFire && (e.track || e.reversal || e.alpha || e.carrion))
      .map(e => e.id), []);

  section('pkoEventFlag reads the ACTIVE event only');
  F.seat({ hoards: [['mouse'], ['bear']], event: null });
  check('no event → every flag is null',
    ['track', 'reversal', 'alpha', 'carrion'].map(k => F.flag(k)), [null, null, null, null]);
  F.set('event', 'deluge');
  check('Deluge → track is sea', F.flag('track'), 'sea');
  check('Deluge → reversal is null, not a false positive', F.flag('reversal'), null);
  F.set('event', 'great-reversal');
  check('Great Reversal → reversal is true', F.flag('reversal'), true);
  check('Great Reversal → track is null', F.flag('track'), null);
  F.set('event', null);

  section('The draw gate — an ineligible event is never selected (D34)');
  F.seat({ hoards: [['mouse', 'bear'], ['leopard', 'bee']], event: null });
  const landOnly = new Set();
  for (let i = 0; i < 400; i++) { F.set('fired', []); F.set('event', null); landOnly.add(F.draw()); }
  check('the Deluge is never drawn when no Hoard can act at sea', landOnly.has('deluge'), false);
  check('the Dry Season IS drawn — every Hoard is land', landOnly.has('dry-season'), true);
  check('the fixed opener is never drawn as a random event',
    landOnly.has('invasive-mimicry'), false);

  F.seat({ hoards: [['fish'], ['octopus']], event: null });
  const seaOnly = new Set();
  for (let i = 0; i < 400; i++) { F.set('fired', []); F.set('event', null); seaOnly.add(F.draw()); }
  check('the Dry Season is never drawn when no Hoard can act on land',
    seaOnly.has('dry-season'), false);
  check('the Deluge IS drawn — every Hoard is sea', seaOnly.has('deluge'), true);

  section('Extinction fires at most once per Clash');
  F.seat({ hoards: [['mouse'], ['bear']], event: null, fired: ['extinction'] });
  const after = new Set();
  for (let i = 0; i < 400; i++) { F.set('event', null); F.draw(); after.add(F.event); }
  check('never redrawn once it is in pkoEventsFired', after.has('extinction'), false);

  section('A drawn event is recorded in the accumulator');
  F.seat({ hoards: [['mouse', 'fish'], ['bear', 'octopus']], event: null, fired: [] });
  const drawn = F.draw();
  check('the drawn id lands in pkoEventsFired', F.fired, [drawn]);
  check('pkoEventFlag is null-safe when no event is live',
    (() => { F.set('event', null); return F.flag('track'); })(), null);

  console.log('\n' + '='.repeat(48));
  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})();
```

> `pkoFireCulling` / `pkoFireExtinction` / `pkoFireMigration` are referenced by `PKO_EVENTS` but not defined until Task 6. That is safe: they sit inside arrow functions that are only invoked when the event fires, and the harness above never fires one. Do **not** stub them — a stub that returns `[]` would silently pass Task 6's checks.

- [ ] **Step 10: Run all three harnesses**

```bash
node tools/verify-pko-chain.js && node tools/verify-pko-loop.js && node tools/verify-pko-events.js
```
Expected: all three `ALL CHECKS PASSED`. `pkoEventFlag` and `pkoCanActUnderTrack` are consulted by nothing yet, so chain must be 58 and loop must be 123 — unchanged.

- [ ] **Step 11: Commit**

```bash
git add js/games/pko.js js/engine.js index.html tools/verify-pko-events.js
git commit -m "feat(pko): Force of Nature event registry, draw gate and interstitial

PKO_EVENTS as plain data; canFire() gates the draw so an event nobody can
answer is never selected (D34) — no skip loop, no cap. Adds screen-pko-event
(interstitial exception, both sides time locally) and a third harness.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Passive events — The Great Reversal and the two track locks

Both are one-line reads off `pkoEventFlag`, landing in predicates that already exist. The Great Reversal needs **zero new data**: `pkoBeatsMap`/`pkoBeatsWideMap` are already derived at load, so reversal just reads the other one. The track lock needs one new predicate and one new message — PKO surfaces *why* a play is illegal rather than presenting a dead button (the BUG-04 precedent).

**Files:**
- Modify: `js/games/pko.js:125-130` (`pkoPredators`), `:143-159` (new `pkoTrackOk` + `pkoAnswers`), `:759-768` (`pkoRejectionReason`), `:969-985` (`pkoSubmitStake`), `:1064-1085` (`pkoApplyStake`), `:718-726` (`pkoCanStampede`), `:1185-1206` (`pkoApplyStampede`), `:523-549` (`pkoRenderTable`)
- Modify: `tools/verify-pko-events.js`

**Interfaces:**
- Consumes: `pkoEventFlag(key)`, `pkoCanActUnderTrack(hoard, track)` (Task 4).
- Produces: `pkoTrackOk(id)` → bool and `pkoTrackReason()` → string. `pkoTrackOk` is consulted inside `pkoAnswers` (so every Challenge path inherits it) and explicitly in the Stake and Stampede paths, which do not route through `pkoAnswers`. Task 7 relies on `pkoTrackOk` being applied to **resolved** ids so a Mimic inherits its claim's track for free.

- [ ] **Step 1: Write the failing checks**

Append to `tools/verify-pko-events.js`, before the closing `console.log` block:

```js
  section('The Great Reversal — the prey set becomes the predator set (§7.2)');
  ['sated', 'ravenous'].forEach(mode => {
    F.seat({ hoards: [['mouse'], ['bear']], event: null, appetite: mode });
    const ids = ['mouse', 'fish', 'eagle', 'elephant', 'bear', 'leopard'];
    const normal = ids.map(id => F.predators(id));
    F.set('event', 'great-reversal');
    const rev = ids.map(id => F.predators(id));
    F.set('event', null);
    check(`[${mode}] reversal is an involution — turning it off restores the graph`,
      ids.map(id => F.predators(id)), normal);
    check(`[${mode}] the Eagle becomes beatable when reversed (intended chaos — do not "fix")`,
      normal[2].length === 0 && rev[2].length > 0, true);
    check(`[${mode}] the Elephant becomes the weakest — its prey set was empty`,
      normal[3].length > 0 && rev[3].length >= 0, true);
    F.set('event', 'great-reversal');
    check(`[${mode}] a Poacher still beats every Mark under reversal`,
      ['mouse', 'eagle', 'elephant', 'human'].filter(id => !F.beats(id, 'human')), []);
    check(`[${mode}] nothing but a Poacher beats a Poacher-Mark under reversal`,
      ['mouse', 'eagle', 'bear'].filter(id => F.beats('human', id)), []);
    F.set('event', null);
  });

  section('Reversal COMPOSES with Appetite — four graphs, all pre-built');
  F.seat({ hoards: [['mouse']], event: 'great-reversal', appetite: 'sated' });
  const revSated = F.predators('leopard');
  F.set('appetite', 'ravenous');
  const revWide = F.predators('leopard');
  check('Ravenous reversal reaches at least as far as Sated reversal',
    revWide.length >= revSated.length && revSated.every(x => revWide.includes(x)), true);
  check('the two are not identical — Ravenous really does add edges',
    revWide.length > revSated.length, true);
  F.set('appetite', 'sated'); F.set('event', null);

  section('Track locks — the playability predicate (§7.3)');
  check('a sea card qualifies under a sea lock', F.canAct(['fish'], 'sea'), true);
  check('a land card does NOT qualify under a sea lock', F.canAct(['bear'], 'sea'), false);
  check('a Poacher always qualifies', F.canAct(['human'], 'sea'), true);
  check('a lone Mimic does NOT qualify — it needs a real anchor',
    F.canAct(['mimic'], 'sea'), false);
  check('a Mimic plus a sea card qualifies', F.canAct(['mimic', 'fish'], 'sea'), true);
  check('an empty Hoard qualifies for nothing', F.canAct([], 'sea'), false);

  section('The lock bites inside pkoAnswers, so every Challenge path inherits it');
  F.seat({ hoards: [['bear']], marks: ['leopard'], event: null });
  check('no lock → a Bear answers a Leopard', F.answers('leopard', ['bear']), true);
  F.set('event', 'deluge');
  check('Deluge → the land Bear may not answer at all', F.answers('leopard', ['bear']), false);
  check('Deluge → a Poacher is unaffected', F.answers('leopard', ['human']), true);
  check('Deluge → a sea Swarm on a sea Mark is legal', F.answers('fish', ['fish', 'fish']), true);
  F.set('event', 'dry-season');
  check('Dry Season → the land Bear is legal again', F.answers('leopard', ['bear']), true);
  check('Dry Season → a sea Swarm is refused', F.answers('fish', ['fish', 'fish']), false);
  check('Dry Season → a Poacher is still unaffected', F.answers('fish', ['human']), true);
  F.set('event', null);

  section('The Leader pass — the Stake walks clockwise to the first seat that can act');
  // P0 leads but holds only land; P1 is land too; P2 is the first clockwise seat at sea.
  F.seat({
    hoards: [['bear', 'leopard'], ['elephant'], ['fish', 'octopus'], ['bee']],
    event: null, leader: 0, encounter: 5, sylly: true,
  });
  check('the turn passes to the first seat that can act at sea',
    F.startWithEvent('deluge'), 2);
  check('leadership itself does NOT transfer — pkoLeaderIdx is untouched', F.leader, 0);
  check('the Leader keeps the turn when they CAN act',
    (() => {
      F.seat({ hoards: [['fish'], ['bear'], ['octopus']], leader: 1, encounter: 5, sylly: true });
      return F.startWithEvent('dry-season');
    })(), 1);
  check('with no lock the turn is simply the Leader',
    (() => {
      F.seat({ hoards: [['fish'], ['bear'], ['octopus']], leader: 2, encounter: 5, sylly: true });
      return F.startWithEvent('great-reversal');
    })(), 2);
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node tools/verify-pko-events.js
```
Expected: FAIL on the reversal checks (`the Eagle becomes beatable` gets `false`) and on every `pkoAnswers` track check. The six `canAct` checks already PASS — that predicate landed in Task 4. The Leader-pass checks fail too (the turn is always the Leader today).

- [ ] **Step 3: Make `pkoPredators` reversal-aware**

Replace `js/games/pko.js:125-130`:

```js
// The active predator set for a Mark, under the current Appetite AND the current event.
// Every "what beats this?" question — combat, builder highlighting, the chain overlay's
// Animals tab — reads through here, so Sated/Ravenous and Force of Nature's Great
// Reversal can never disagree with each other at a single call site.
// Reversal COMPOSES with Appetite rather than overriding it: all four graphs are derived
// at load, so this only chooses between them and adds no data (§7.2). Apex/dead-end
// inversion (the Eagle becomes beatable, the Elephant becomes weakest) is intended
// chaos — brief §7 flags it explicitly. Do not "fix" it.
function pkoPredators(markId) {
  const rev  = pkoEventFlag('reversal');
  const wide = pkoAppetite === 'ravenous';
  const map  = rev ? (wide ? pkoBeatsWideMap : pkoBeatsMap)      // prey set becomes predator set
                   : (wide ? pkoBeatenByWide : pkoBeatenByMap);
  return map[markId];
}
```

The Poacher is unaffected for free: `pkoBeats` tests `cardId === PKO_POACHER_ID` **before** calling `pkoPredators` (line 138), and `pkoBeatsMap.human` is empty, so nothing but a Poacher beats a Poacher-Mark under reversal either. Both brief rules hold with no new code.

- [ ] **Step 4: Add `pkoTrackOk` and fold it into `pkoAnswers`**

Insert directly above the `// ── Per-slot legality` header (line 143):

```js
// ── Force of Nature — the track lock (§7.3) ───────────────────────────────
// May this card be played at all right now? Applied to RESOLVED ids, so a Mimic
// inherits its claimed species' track automatically and needs no special case here.
function pkoTrackOk(id) {
  const lock = pkoEventFlag('track');
  if (!lock) return true;
  if (id === PKO_POACHER_ID) return true;              // the Poacher hunts in any weather
  return (((pkoChain && pkoChain[id]) || {}).track === lock);
}
```

Then add the gate as the first thing in `pkoAnswers` after the array guard:

```js
function pkoAnswers(markId, cards) {
  if (!Array.isArray(cards)) return false;
  // A track lock is per-CARD legality, checked here so every Challenge consumer —
  // builder highlighting, the confirm gate, the table's quick path and the host's
  // re-validation — inherits it from the one predicate they already share.
  if (!cards.every(pkoTrackOk)) return false;
  if (cards.length === 1) return pkoBeats(markId, cards[0]);
  ...
```
(the rest of the function is unchanged)

- [ ] **Step 5: Gate the Stake and the Stampede explicitly**

Neither routes through `pkoAnswers`, so each needs the check in both the client-side submit (for the immediate `playBoing()`) and the host applier (which is authoritative).

`pkoSubmitStake` — after the existing species/Poacher check (line 974):
```js
  if (!cards.every(pkoTrackOk)) { playBoing(); pkoChallengeHint(pkoTrackReason()); return; }
```
`pkoApplyStake` — add to the `valid` chain (line 1071):
```js
    && cards.every(pkoTrackOk)
```
`pkoCanStampede` — after the Poacher check (line 724):
```js
  if (!pkoTrackOk(species)) return false;
```
`pkoApplyStampede` — add to the `valid` chain (line 1190):
```js
    && pkoTrackOk(species)
```

- [ ] **Step 6: Name the reason instead of showing a dead button**

Add beside `pkoRejectionReason` (line 759):

```js
// The track lock's own message. A disabled button with no reason is exactly the BUG-04
// failure mode — PKO surfaces WHY a play is illegal, always.
function pkoTrackReason() {
  const lock = pkoEventFlag('track');
  if (!lock) return '';
  return lock === 'sea'
    ? 'The Deluge — only the sea may hunt. A Poacher still can.'
    : 'The Dry Season — only the land may hunt. A Poacher still can.';
}
```
and make `pkoRejectionReason` prefer it, as its first line:
```js
function pkoRejectionReason(markId, cardId) {
  if (!pkoTrackOk(cardId)) return pkoTrackReason();
  const mark = pkoCardName(markId);
```

In `pkoRenderTable`, immediately after the three existing `show(...)` calls (line 527-529), add the disabled-with-reason block. A player who cannot answer the *current* board Retreats by choice — **there is no auto-Retreat**, because "can't answer" is not a stable property (the Marks change species on every board change) and auto-Retreating would entangle `pkoCheckEncounterEnd()`'s termination proof.

```js
  // Under a track lock a player may hold no legal card at all. The action button stays
  // VISIBLE and disabled with the reason written on it — a vanished button teaches
  // nothing. Retreat is always still available; there is deliberately no auto-Retreat.
  const lock = pkoEventFlag('track');
  const lockMsg = lock === 'sea' ? 'The Deluge — only the sea may hunt'
                                 : 'The Dry Season — only the land may hunt';
  [['btn-pko-stake', empty], ['btn-pko-challenge', !empty]].forEach(([id, live]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (myTurn && live && lock && !pkoCanActUnderTrack(pkoMyHoard, lock)) {
      el.disabled = true; el.style.opacity = '0.45'; el.textContent = lockMsg;
    } else {
      // The reset is NOT optional: pkoRefreshActionLabels rewrites textContent every
      // render, but `disabled` and `opacity` are sticky — without this a button
      // disabled under the Deluge stays dead for the rest of the Clash.
      el.disabled = false; el.style.opacity = '1';
    }
  });
```

> Place this block **after** `pkoRefreshActionLabels()` (line 526) so the lock message wins over the label it would otherwise write.

- [ ] **Step 7: Run all three harnesses**

```bash
node tools/verify-pko-chain.js && node tools/verify-pko-loop.js && node tools/verify-pko-events.js
```
Expected: all `ALL CHECKS PASSED`. **The loop harness must still be 123/123** — with no event live, `pkoEventFlag` returns null, `pkoTrackOk` returns `true` unconditionally, and `pkoPredators` picks the same map it always did. If any loop check moves, a flag is leaking when `pkoEvent` is null.

- [ ] **Step 8: Commit**

```bash
git add js/games/pko.js tools/verify-pko-events.js
git commit -m "feat(pko): The Great Reversal and the two track locks

Reversal reads the already-derived forward map — zero new data, composes with
Appetite across four pre-built graphs. Track locks fold into pkoAnswers so every
Challenge path inherits them, and a blocked button names the reason (BUG-04).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: Mutating events — The Culling, Extinction Event, Migration

The three `onFire` events. Each runs host-side against an empty board, mutates Hoards, batches its discards into the Watering Hole, writes Trail lines, calls `pkoSyncAllHands()`, and returns the seats it emptied. **Only Extinction can return a non-empty array** — The Culling cannot by construction (§6/D27), and Migration conserves every card.

**Files:**
- Modify: `js/games/pko.js` (three new functions in the Force of Nature section, after `pkoDrawEvent`)
- Modify: `tools/verify-pko-events.js`

**Interfaces:**
- Consumes: `pkoSyncAllHands()` (Task 2), `pkoResolveClash(winnerIdxs)` (Task 3), the `onFire` contract (Task 4).
- Produces: `pkoFireCulling()`, `pkoFireExtinction()`, `pkoFireMigration()` — each `() => int[]`. Referenced already by `PKO_EVENTS` from Task 4.

- [ ] **Step 1: Write the failing checks**

Append to `tools/verify-pko-events.js`:

```js
  section('The Culling — discard your fewest-held species (§7.6)');
  F.seat({ hoards: [['mouse', 'mouse', 'mouse', 'bear'], ['fish', 'fish', 'octopus', 'octopus']],
           event: null, encounter: 5, sylly: true });
  F.startWithEvent('culling');
  check('the singleton species is culled', F.hoards[0], ['mouse', 'mouse', 'mouse']);
  check('a tie culls exactly ONE species, not both', F.hoards[1].length, 2);
  check('the tie broke to the lower PKO_PREY_RANK — Fish (1) before Octopus (2)',
    F.hoards[1], ['octopus', 'octopus']);
  check('counts follow the Hoards', F.counts, [3, 2]);
  check('the culled cards reached the Watering Hole',
    F.wateringFlat.sort(), ['bear', 'fish', 'fish']);
  check('one batch record for the whole event, not one per player', F.watering.length, 1);

  section('The Culling can NEVER empty a Hoard (§6 / D27)');
  F.seat({ hoards: [['mouse'], ['fish', 'fish']], event: null, encounter: 5, sylly: true });
  check('holding one species discards nothing at all',
    F.startWithEvent('culling') >= 0 && F.hoards[0].length === 1 && F.hoards[1].length === 2, true);
  check('nobody scored', F.scores, [0, 0]);
  F.seat({ hoards: [['mouse', 'bear', 'fish'], ['eagle', 'eagle']], event: null, encounter: 5, sylly: true });
  F.startWithEvent('culling');
  check('a three-way tie still leaves two cards', F.hoards[0].length, 2);
  check('a single-species Hoard is untouched', F.hoards[1], ['eagle', 'eagle']);

  section('Extinction Event — the globally rarest species is wiped (§8)');
  F.seat({ hoards: [['mouse', 'mouse', 'bear'], ['mouse', 'bear', 'bear'], ['mouse', 'eagle']],
           event: null, encounter: 5, sylly: true });
  // Census: mouse 4, bear 3, eagle 1 → eagle is the minimum.
  F.startWithEvent('extinction');
  check('every copy of the rarest species is gone',
    F.hoards.flat().filter(c => c === 'eagle'), []);
  check('nothing else was touched', F.hoards.flat().sort(),
    ['bear', 'bear', 'bear', 'mouse', 'mouse', 'mouse', 'mouse']);
  check('the wiped cards reached the Watering Hole', F.wateringFlat, ['eagle']);

  section('Extinction wipes ALL tied-minimum species');
  F.seat({ hoards: [['mouse', 'mouse', 'bear'], ['mouse', 'eagle', 'fish']],
           event: null, encounter: 5, sylly: true });
  // Census: mouse 3, bear 1, eagle 1, fish 1 → three species tie at the minimum.
  F.startWithEvent('extinction');
  check('all three minimum species are wiped together', F.hoards.flat().sort(),
    ['mouse', 'mouse', 'mouse']);

  section('Extinction can empty several Hoards → joint scorers (§6)');
  F.seat({ hoards: [['mouse', 'mouse'], ['eagle'], ['fish'], ['mouse', 'bear', 'bear']],
           event: null, encounter: 5, sylly: true, scores: [0, 0, 0, 0] });
  F.set('clashTarget', 9);
  // Census: mouse 3, bear 2, eagle 1, fish 1 → Eagle and Fish tie at 1; P1 and P2 empty.
  F.startWithEvent('extinction');
  check('both emptied seats score', F.scores, [0, 1, 1, 0]);
  check('the Clash ended before a card was played', F.marks, []);

  section('Migration — every Hoard moves one seat to the left');
  F.seat({ hoards: [['mouse'], ['bear', 'bear'], ['fish', 'fish', 'fish']],
           event: null, encounter: 5, sylly: true });
  F.startWithEvent('migration');
  check('P0 receives what P2 held — one seat clockwise', F.hoards[0], ['fish', 'fish', 'fish']);
  check('P1 receives what P0 held', F.hoards[1], ['mouse']);
  check('P2 receives what P1 held', F.hoards[2], ['bear', 'bear']);
  check('counts follow the Hoards', F.counts, [3, 1, 2]);
  check('total card count is conserved', F.hoards.flat().length, 6);
  check('Migration discards nothing', F.wateringFlat, []);
  check('Migration never scores', F.scores, [0, 0, 0]);

  section('Every mutating event writes the Trail');
  F.seat({ hoards: [['mouse', 'bear'], ['fish', 'fish']], event: null, encounter: 5, sylly: true });
  F.startWithEvent('culling');
  check('the event names itself at the head of the Encounter',
    F.trail.some(e => /The Culling/.test(e.text)), true);
  check('a per-player line names what was lost',
    F.trail.filter(e => /was Culled/.test(e.text)).length >= 1, true);
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node tools/verify-pko-events.js
```
Expected: a `ReferenceError: pkoFireCulling is not defined` thrown out of `startWithEvent`. That is the correct failure — Task 4 deliberately left the three functions undefined rather than stubbed.

- [ ] **Step 3: Log the event at the head of every Encounter**

In `pkoStartEncounter` (Task 4's version), immediately after the `pkoDrawEvent()` line and **before** the `onFire` block, so the event's own name precedes its per-player consequences:

```js
  if (pkoEvent) {
    const named = PKO_EVENTS.find(x => x.id === pkoEvent);
    if (named) pkoLogTrail(`Force of Nature — ${named.name}. ${named.blurb}`);
  }
```

- [ ] **Step 4: Implement the three mutating events**

Append to the Force of Nature section in `js/games/pko.js`, after `pkoDrawEvent`:

```js
// ── Force of Nature — the mutating events (onFire) ────────────────────────
// Each runs HOST-SIDE against an empty board, mutates Hoards, batches its discards
// into the Watering Hole as ONE record (so the Discards tab stays grouped by the play
// that spent the cards), and returns the seats it emptied. Only Extinction can ever
// return a non-empty array.

// Every copy of `ids` leaves `playerIdx` and joins one shared discard batch.
function pkoCullFrom(playerIdx, ids, batch) {
  const hoard = pkoHoards[playerIdx] || [];
  const set   = new Set(ids);
  const gone  = hoard.filter(c => set.has(c));
  if (!gone.length) return [];
  pkoHoards[playerIdx] = hoard.filter(c => !set.has(c));
  batch.push(...gone);
  return gone;
}

// The Culling — each player discards their FEWEST-held species. Ties resolve host-side
// by lowest PKO_PREY_RANK (the table Small Fry already uses) then by chain order, so the
// event stays a pure interstitial: no player choice, no ACTION, no readyCheck (D28).
// Holding exactly one species discards nothing, which is why this can never empty a
// Hoard and therefore never scores (§6 / D27).
function pkoFireCulling() {
  const batch = [];
  for (let i = 0; i < pkoPlayerCount; i++) {
    const hoard = pkoHoards[i] || [];
    const counts = new Map();
    hoard.forEach(c => counts.set(c, (counts.get(c) || 0) + 1));
    if (counts.size <= 1) continue;                       // one species (or none) → nothing to cull
    const min = Math.min(...counts.values());
    const tied = [...counts.keys()].filter(c => counts.get(c) === min);
    const order = Object.keys(pkoChain || {});
    tied.sort((a, b) =>
      (PKO_PREY_RANK[a] ?? 99) - (PKO_PREY_RANK[b] ?? 99) || order.indexOf(a) - order.indexOf(b));
    const gone = pkoCullFrom(i, [tied[0]], batch);        // exactly ONE species, even on a tie
    if (gone.length) {
      pkoLogTrail(`${pkoPlayerNames[i]} was Culled — lost ${pkoSummariseCards(gone)}.`);
    }
  }
  if (batch.length) pkoWateringHole.push({ enc: pkoEncounterNum, cards: batch });
  pkoSyncAllHands();
  return [];                                              // structurally cannot empty a Hoard
}

// Extinction Event — count every species across ALL Hoards combined and wipe the
// minimum. ALL tied species are wiped, not one of them: the census is global, so a tie
// means several species are equally on the brink. Once per Clash (its own canFire).
// This is the ONLY event that can empty a Hoard, and it can empty several at once —
// which is the whole reason pkoResolveClash takes an array (§6).
function pkoFireExtinction() {
  const census = new Map();
  pkoHoards.forEach(h => h.forEach(c => census.set(c, (census.get(c) || 0) + 1)));
  if (!census.size) { pkoSyncAllHands(); return []; }
  const min  = Math.min(...census.values());
  const doomed = [...census.keys()].filter(c => census.get(c) === min);
  const batch = [];
  const emptied = [];
  for (let i = 0; i < pkoPlayerCount; i++) {
    const gone = pkoCullFrom(i, doomed, batch);
    if (gone.length) {
      pkoLogTrail(`${pkoPlayerNames[i]} lost ${pkoSummariseCards(gone)} to the Extinction Event.`);
    }
    if ((pkoHoards[i] || []).length === 0) emptied.push(i);
  }
  if (batch.length) pkoWateringHole.push({ enc: pkoEncounterNum, cards: batch });
  pkoLogTrail(`${doomed.map(pkoCardName).join(', ')} went extinct.`);
  pkoSyncAllHands();
  return emptied;
}

// Migration — every Hoard moves one seat clockwise, to the player on your left. Total
// card count is conserved, nothing is discarded, and nobody can be emptied.
function pkoFireMigration() {
  const moved = [];
  for (let i = 0; i < pkoPlayerCount; i++) moved[(i + 1) % pkoPlayerCount] = pkoHoards[i];
  pkoHoards = moved;
  pkoLogTrail('All Hoards migrated one seat to the left.');
  pkoSyncAllHands();
  return [];
}
```

> `pkoSyncAllHands()` is what makes these safe on a client, and it is the entire reason for Task 2. Each of the three changes a Hoard **without a card being played**, so the repair packet has to key on "this Hoard changed". TG-07 means no harness can prove the packet arrives — the shape of the call is the protection.

- [ ] **Step 5: Run all three harnesses**

```bash
node tools/verify-pko-chain.js && node tools/verify-pko-loop.js && node tools/verify-pko-events.js
```
Expected: all `ALL CHECKS PASSED`, chain 58, loop 123. If `a tie culls exactly ONE species` fails with a shorter Hoard, `pkoCullFrom` is being handed `tied` instead of `[tied[0]]`.

- [ ] **Step 6: Commit**

```bash
git add js/games/pko.js tools/verify-pko-events.js
git commit -m "feat(pko): The Culling, Extinction Event and Migration

Three onFire events, each returning the seats it emptied. The Culling can never
empty a Hoard by construction (D27); Extinction can empty several at once, which
is why pkoResolveClash takes an array. All three route through pkoSyncAllHands.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: The Mimic and Invasive Mimicry

The largest task, and the one with the classic bug site. **Appliers need both arrays:** `played` (raw ids, including `'mimic'`) for `pkoHoldsAll` and `pkoRemoveFromHoard`, and `resolved` for `pkoMarks`. Removing the resolved ids would delete cards the player never held.

The design that keeps this small: `pkoResolveGroup` is the **only** place a Mimic is ever interpreted, and `pkoAnswers` routes through it — so builder highlighting, the confirm gate, the table's quick path and the host's re-validation all become Mimic-aware from one edit, exactly as they already share `pkoBeats`. `pkoMarks` stays a flat array of real species ids and `pkoBeats()` needs **no changes at all** (D33).

**Spec Correction C1 applies here.** §7.1's snippet rejects *any* Poacher claim; a plain one-card `['human']` answer would then become illegal, and a Poacher is the only thing that beats an Eagle-Mark. The rejection must be conditional on a Mimic actually being in the group.

**Files:**
- Modify: `js/games/pko.js` — `pkoResolveGroup` (new, beside `pkoAnswers`), `pkoAnswers`, `pkoSlotAccepts`, `pkoRejectionReason`, `pkoAutoFillSlot`, `pkoCycleStakeGroup`, `pkoRefreshActionLabels`, `pkoRenderMyHoard`, `pkoSubmitStake`, `pkoApplyStake`, `pkoApplyChallenge`, `pkoCanStampede`, `pkoApplyStampede`, `pkoStartClash`
- Modify: `tools/verify-pko-events.js`

**Interfaces:**
- Consumes: `PKO_MIMIC_ID`, `PKO_FON_DEAL_BONUS_DIV` (Task 4); `pkoTrackOk` (Task 5); `pkoSyncHand` (Task 2).
- Produces:
  - `pkoResolveGroup(cards)` → `{ ok: false }` or `{ ok: true, claim: string, resolved: string[] }`
  - `pkoStampedeSpend(hoard, species, count)` → `string[]` of **raw** ids to remove, or `null` when the Hoard can't pay
  - `pkoApplyInvasiveMimicry()` → void; called only from `pkoStartClash`
- Task 8 (Alpha) and Task 9 (Carrion) both consume `resolved` arrays from `pkoApplyChallenge`.

- [ ] **Step 1: Write the failing checks**

Append to `tools/verify-pko-events.js`:

```js
  section('pkoResolveGroup — the ONLY place a Mimic is interpreted (§7.1)');
  F.seat({ hoards: [['mouse']], event: null });
  const RG = id => sandbox.pkoResolveGroup(id);
  check('a Mimic is never solo', RG(['mimic']).ok, false);
  check('an all-Mimic group is never legal', RG(['mimic', 'mimic']).ok, false);
  check('two different real species is not one claim', RG(['mouse', 'bear']).ok, false);
  check('a real card plus a Mimic claims that species',
    [RG(['mouse', 'mimic']).ok, RG(['mouse', 'mimic']).claim], [true, 'mouse']);
  check('the resolved array replaces the Mimic with the claim',
    RG(['mouse', 'mimic']).resolved, ['mouse', 'mouse']);
  check('a Mimic cannot copy a Poacher', RG(['human', 'mimic']).ok, false);
  check('C1 — a PLAIN Poacher is still legal (no Mimic in the group)',
    [RG(['human']).ok, RG(['human']).claim], [true, 'human']);
  check('a plain single card is unchanged',
    [RG(['bear']).ok, RG(['bear']).resolved], [true, ['bear']]);
  check('an empty group is illegal', RG([]).ok, false);

  section('pkoAnswers is unchanged for every Mimic-free input');
  F.seat({ hoards: [['mouse']], marks: ['leopard'], event: null });
  check('a predator still answers', F.answers('leopard', ['bear']), true);
  check('a non-predator still does not', F.answers('leopard', ['mouse']), false);
  check('a Swarm still answers', F.answers('leopard', ['leopard', 'leopard']), true);
  check('a Poacher still answers anything', F.answers('eagle', ['human']), true);
  check('a Poacher-Mark still cannot be Swarmed', F.answers('human', ['human', 'human']), false);

  section('The Mimic in a Swarm slot (§7.1)');
  check('Mouse + Mimic Swarms a Mouse-Mark', F.answers('mouse', ['mouse', 'mimic']), true);
  check('Mimic + Mouse — order does not matter', F.answers('mouse', ['mimic', 'mouse']), true);
  check('Mimic + Mimic never Swarms anything', F.answers('mouse', ['mimic', 'mimic']), false);
  check('Mouse + Mimic does NOT Swarm a Fish-Mark', F.answers('fish', ['mouse', 'mimic']), false);
  check('Poacher + Mimic cannot Swarm', F.answers('human', ['human', 'mimic']), false);
  check('a lone Mimic answers nothing', F.answers('mouse', ['mimic']), false);

  section('The classic bug site — removal uses RAW ids, the board uses RESOLVED');
  F.seat({
    hoards: [['bee'], ['mouse', 'mimic', 'bear']],
    marks: ['mouse'], owner: 0, turn: 1, event: null,
  });
  sandbox.pkoApplyChallenge(1, { assignments: [['mouse', 'mimic']] });
  check('the Mimic left the Hoard — the RAW id was removed', F.hoards[1].sort(), ['bear']);
  check('no Mimic ever reaches the board', F.marks, ['mouse', 'mouse']);
  check('the board grew by one — a Swarm is still a Swarm', F.marks.length, 2);
  check('the Hoard count follows', F.counts[1], 1);

  section('A Mimic-padded Stake');
  F.seat({ hoards: [['mouse', 'mimic', 'bear'], ['eagle']], turn: 0, event: null });
  sandbox.pkoApplyStake(0, { cards: ['mouse', 'mimic'] });
  check('the board is two Mice, not a Mouse and a Mimic', F.marks, ['mouse', 'mouse']);
  check('both raw cards left the Hoard', F.hoards[0], ['bear']);
  F.seat({ hoards: [['mimic', 'mimic', 'bear'], ['eagle']], turn: 0, event: null });
  sandbox.pkoApplyStake(0, { cards: ['mimic', 'mimic'] });
  check('an all-Mimic Stake is refused — the board stays empty', F.marks, []);
  check('nothing left the Hoard on a refused Stake', F.hoards[0].length, 3);

  section('A Mimic-padded Stampede');
  F.seat({
    hoards: [['bee'], ['mouse', 'mouse', 'mimic', 'bear']],
    marks: ['mouse', 'mouse'], owner: 0, turn: 1, event: null,
  });
  sandbox.pkoApplyStampede(1, { species: 'mouse', count: 3 });
  check('the board is three real Mice', F.marks, ['mouse', 'mouse', 'mouse']);
  check('real copies are spent before Mimics, and the Mimic was spent too',
    F.hoards[1], ['bear']);
  F.seat({
    hoards: [['bee'], ['mimic', 'mimic', 'mimic', 'bear']],
    marks: ['mouse', 'mouse'], owner: 0, turn: 1, event: null,
  });
  sandbox.pkoApplyStampede(1, { species: 'mouse', count: 3 });
  check('an all-Mimic Stampede is refused — needs at least one real copy',
    F.marks, ['mouse', 'mouse']);

  section('Small Fry ignores Mimics entirely (§10)');
  F.seat({ hoards: [['mimic', 'mimic', 'mouse', 'bear'], ['eagle']], turn: 0, event: null });
  F.set('startSmallOn', true);   // see Step 8 — bridge setter
  check('a Hoard of Mimics plus one Mouse must open with the Mouse',
    [...(sandbox.pkoOpenerSpecies(F.hoards[0]) || [])], ['mouse']);

  section('Invasive Mimicry — the deal (§9)');
  for (const [size, bonus] of [[10, 3], [12, 3], [15, 4]]) {
    check(`Hoard ${size} → bonus ${bonus} (round(size/4), not the brief’s flat +5 — D25)`,
      Math.round(size / 4), bonus);
  }
  check('2n Mimics enter the Reserve and the base deal is Mimic-free',
    (() => {
      F.seat({ hoards: [[], [], []], event: null });
      F.set('hoardSize', 12); F.set('sylly', true);
      sandbox.pkoStartClash();
      const total = F.hoards.flat().length;
      const mimics = F.hoards.flat().filter(c => c === 'mimic').length;
      return [F.hoards.every(h => h.length === 15), total === 45, mimics <= 6, mimics >= 0];
    })(), [true, true, true, true]);
  check('the fixed opener is recorded as Encounter 1’s event', F.event, 'invasive-mimicry');
  check('pkoEventsFired holds exactly the opener', F.fired, ['invasive-mimicry']);
  check('with Sylly Mode OFF nothing changes',
    (() => {
      F.seat({ hoards: [[], [], []], event: null });
      F.set('hoardSize', 12); F.set('sylly', false);
      sandbox.pkoStartClash();
      return [F.hoards.every(h => h.length === 12),
              F.hoards.flat().filter(c => c === 'mimic').length, F.event];
    })(), [true, 0, null]);
```

- [ ] **Step 2: Add the two bridge setters the checks need**

In `tools/verify-pko-events.js`'s `BRIDGE`, extend `set(k, v)`:
```js
    if (k === 'startSmallOn') { pkoStartSmall = v ? 'match' : 'off'; pkoClashNum = 1; pkoEncounterNum = 1; }
```
`pkoStartClash` is a `function` declaration so it is already reachable as `sandbox.pkoStartClash`; `pkoResolveGroup` and `pkoOpenerSpecies` likewise. No further bridge work.

- [ ] **Step 3: Run it to verify it fails**

```bash
node tools/verify-pko-events.js
```
Expected: `TypeError: sandbox.pkoResolveGroup is not a function`. Once Step 4 lands, the remaining failures should be the applier checks.

- [ ] **Step 4: Add `pkoResolveGroup` and route `pkoAnswers` through it**

Insert directly above `pkoAnswers` (after `pkoTrackOk` from Task 5):

```js
// ── Force of Nature — the Mimic ───────────────────────────────────────────
// ONE rule covering three mechanics (§7.1):
//   "A play containing a Mimic must also contain at least one real card of the
//    species being claimed."
// That makes the claim INFERABLE, so there is no claim UI to build, and it makes the
// Mimic the exact mirror of the Poacher: the Poacher is solo-ONLY, the Mimic is
// NEVER solo (D32).
//
// This is the ONLY place a Mimic is interpreted. Mimics resolve to the claimed species
// at play time and never reach the board, so pkoMarks stays a flat array of real
// species ids and pkoBeats() needs no changes at all (D33).
//
// ⚠️ Callers need BOTH arrays: the RAW `cards` for pkoHoldsAll/pkoRemoveFromHoard, and
// `resolved` for pkoMarks. Removing the resolved ids would delete cards the player
// never held — the classic bug site the spec calls out.
function pkoResolveGroup(cards) {
  if (!Array.isArray(cards) || !cards.length) return { ok: false };
  const real = cards.filter(c => c !== PKO_MIMIC_ID);
  if (!real.length) return { ok: false };                        // never solo, never all-Mimic
  if (new Set(real).size !== 1) return { ok: false };            // one claimed species only
  const claim = real[0];
  // A Mimic cannot copy a Poacher. Guarded on a Mimic actually being present: a PLAIN
  // Poacher answer is legal and is the only thing that beats an Eagle-Mark, so an
  // unconditional rejection here would quietly outlaw it (Spec Correction C1).
  if (claim === PKO_POACHER_ID && real.length !== cards.length) return { ok: false };
  return { ok: true, claim, resolved: cards.map(() => claim) };
}
```

Then rewrite `pkoAnswers` (Task 5's version) to resolve first:

```js
function pkoAnswers(markId, cards) {
  if (!Array.isArray(cards)) return false;
  const g = pkoResolveGroup(cards);
  if (!g.ok) return false;
  const res = g.resolved;                       // Mimics are already the claimed species
  // A track lock is per-CARD legality, applied to RESOLVED ids so a Mimic inherits its
  // claim's track automatically (§7.3). Checked here so every Challenge consumer —
  // builder highlighting, the confirm gate, the table's quick path and the host's
  // re-validation — inherits it from the one predicate they already share.
  if (!res.every(pkoTrackOk)) return false;
  if (res.length === 1) return pkoBeats(markId, res[0]);
  if (res.length !== 2) return false;
  // Poacher is solo-only (brief v6): it can neither Swarm nor be Swarmed.
  if (markId === PKO_POACHER_ID) return false;
  return res.every(c => c === markId && c !== PKO_POACHER_ID);
}
```

This is behaviour-preserving for every Mimic-free input: a 1-card group has one species, and a 2-card group already had to be two of the Mark's own species, so `pkoResolveGroup` never rejects anything that was previously legal. The "pkoAnswers is unchanged" section of the harness is what proves it.

- [ ] **Step 5: Teach the appliers raw-vs-resolved**

`pkoApplyStake` — replace the `valid` chain and the two lines after it:
```js
  const g = pkoResolveGroup(cards);
  const opener = pkoOpenerSpecies(hoard);
  const valid = playerIdx === pkoTurnIdx
    && pkoMarks.length === 0
    && g.ok
    && g.claim !== PKO_POACHER_ID              // a Poacher is never Staked as an animal
    && g.resolved.every(pkoTrackOk)
    && (!opener || opener.has(g.claim))        // Small Fry judges the CLAIM, never the Mimic
    && pkoHoldsAll(hoard, cards);              // RAW ids — the Hoard holds Mimics, not claims
  if (!valid) { pkoBroadcastBoard(); return; }

  pkoRemoveFromHoard(playerIdx, cards);        // RAW
  pkoMarks        = g.resolved.slice();        // RESOLVED — no Mimic ever becomes a Mark
  pkoMarkOwnerIdx = playerIdx;
  pkoLogTrail(`${pkoPlayerNames[playerIdx]} Staked ${cards.length} × ${pkoCardName(g.claim)}`
    + (cards.length !== g.resolved.filter(c => c === g.claim).length ? '.' : '.'));
```
Simplify that last line to name the Mimics honestly:
```js
  const mimicsUsed = cards.filter(c => c === PKO_MIMIC_ID).length;
  pkoLogTrail(`${pkoPlayerNames[playerIdx]} Staked ${cards.length} × ${pkoCardName(g.claim)}`
    + (mimicsUsed ? ` (${mimicsUsed} Mimic${mimicsUsed > 1 ? 's' : ''}).` : '.'));
```

`pkoApplyChallenge` — replace the mutation block (lines 1171-1176):
```js
  // BOTH arrays. `flat` is raw (it may contain 'mimic') and is what leaves the Hoard;
  // `resolved` is what becomes the board. Swapping them deletes cards the player never
  // held — the classic bug site (§7.1).
  const resolved = groups.map(g => pkoResolveGroup(g).resolved).flat();
  pkoRemoveFromHoard(playerIdx, flat);         // RAW
  pkoDiscardBoard();
  pkoMarks        = resolved;                  // RESOLVED
  pkoMarkOwnerIdx = playerIdx;
```
and the Trail line's `pkoSummariseCards(flat)` becomes `pkoSummariseCards(resolved)` so the log reads in species, not in Mimics — with the Mimic count appended:
```js
  const mimicsUsed = flat.filter(c => c === PKO_MIMIC_ID).length;
  pkoLogTrail(`${pkoPlayerNames[playerIdx]} Challenged with ${pkoSummariseCards(resolved)}`
    + (swarms ? ` — ${swarms} Swarm${swarms > 1 ? 's' : ''}` : '')
    + (mimicsUsed ? ` (${mimicsUsed} Mimic${mimicsUsed > 1 ? 's' : ''})` : '') + '.');
```

`pkoApplyChallenge`'s `valid` chain needs no edit — it already calls `pkoAnswers` per slot and `pkoHoldsAll(hoard, flat)` on the raw ids, both now correct.

- [ ] **Step 6: Let Mimics pad a Stampede**

The Stampede packet carries `{ species, count }` only, and the applier fabricates the cards. With Mimics in play the host must *choose* which raw cards to spend. Spend **real copies first, then Mimics** — it is the only choice that never strands a player holding a real card they can't use, and it keeps the packet shape unchanged.

Add beside `pkoCanStampede` (line 718):
```js
// Which RAW cards a Stampede spends: real copies first, then Mimics. Returns null when
// the Hoard cannot pay. At least one real copy is required — a Stampede is a play
// containing Mimics, so §7.1's one rule applies here exactly as it does to a Swarm.
function pkoStampedeSpend(hoard, species, count) {
  const real = (hoard || []).filter(c => c === species).length;
  const mim  = (hoard || []).filter(c => c === PKO_MIMIC_ID).length;
  if (real < 1 || real + mim < count) return null;
  const spend = [];
  for (let i = 0; i < Math.min(real, count); i++) spend.push(species);
  while (spend.length < count) spend.push(PKO_MIMIC_ID);
  return spend;
}
```
`pkoCanStampede` — replace its last line:
```js
  return !!pkoStampedeSpend(pkoMyHoard, species, pkoMarks.length + 1);
```
`pkoApplyStampede` — replace the hoard-count clause in `valid` and the two lines after it:
```js
  const spend = pkoStampedeSpend(hoard, species, count);
  const valid = playerIdx === pkoTurnIdx
    && pkoMarks.length > 0
    && new Set(pkoMarks).size === 1
    && species === pkoMarks[0]
    && species !== PKO_POACHER_ID
    && pkoTrackOk(species)
    && count === pkoMarks.length + 1
    && !!spend;
  if (!valid) { pkoBroadcastBoard(); return; }

  pkoRemoveFromHoard(playerIdx, spend);        // RAW — may include Mimics
  pkoDiscardBoard();
  pkoMarks        = new Array(count).fill(species);   // RESOLVED — always real species
  pkoMarkOwnerIdx = playerIdx;
```

- [ ] **Step 7: Make the two fans and the builder Mimic-aware**

`pkoRenderMyHoard` — a Mimic must never be greyed out by Small Fry (it is unranked, so `opener.has('mimic')` is false). Change the `barred` line:
```js
      const barred = staking && opener && grp.id !== PKO_MIMIC_ID && !opener.has(grp.id);
```

`pkoCycleStakeGroup` — a Mimic never leads a Stake; it joins one already started. Replace the function body's opening (keeping the trailing render calls):
```js
function pkoCycleStakeGroup(grp) {
  const refuse = msg => {
    playBoing(); pkoShakeFan(grp.positions[grp.positions.length - 1]);
    if (msg) pkoChallengeHint(msg);
  };
  const sorted  = pkoSortHoard(pkoMyHoard);
  const real    = pkoStakeSel.map(p => sorted[p]).filter(c => c !== PKO_MIMIC_ID);
  const current = real.length ? real[0] : null;
  const mine    = pkoStakeSel.filter(p => grp.positions.includes(p)).length;
  const step    = n => (n >= grp.positions.length ? 0 : n + 1);   // 0 → 1 → … → N → 0

  // A Mimic can only ever ride along with a real card of the species being claimed, so
  // it cannot start a selection — it copies whatever is already picked (§7.1).
  if (grp.id === PKO_MIMIC_ID) {
    if (!current) return refuse('A Mimic can’t be Staked alone — pick the animal it copies first.');
    const next = step(mine);
    pkoStakeSel = pkoStakeSel.filter(p => !grp.positions.includes(p))
      .concat(next === 0 ? [] : grp.positions.slice(-next));
  } else {
    if (grp.id === PKO_POACHER_ID) return refuse();
    const opener = pkoOpenerSpecies(pkoMyHoard);            // Small Fry — null when unconstrained
    if (opener && !opener.has(grp.id)) return refuse();
    if (current && current !== grp.id) return refuse();     // mixed real species — refuse the tap
    const next = step(mine);
    // Dropping the real species to zero drops any Mimics with it — they cannot stand alone.
    const mimics = next === 0 ? [] : pkoStakeSel.filter(p => sorted[p] === PKO_MIMIC_ID);
    pkoStakeSel = next === 0 ? [] : grp.positions.slice(-next).concat(mimics);
  }
  playPillClick();
  pkoRenderMyHoard();
  pkoRefreshActionLabels();
}
```

`pkoRefreshActionLabels` — the Stake label must name the *claim*, not whatever card happens to sit at `pkoStakeSel[0]` (which may now be a Mimic). Replace the `stake.textContent` assignment:
```js
  if (stake) {
    const g = pkoStakeSel.length ? pkoResolveGroup(pkoStakeSel.map(p => sorted[p])) : { ok: false };
    stake.textContent = g.ok
      ? `Stake ${pkoStakeSel.length} × ${pkoCardName(g.claim)}`
      : (pkoStakeSel.length ? 'Stake — pick the animal the Mimic copies' : 'Stake');
  }
```

`pkoSlotAccepts` — a lone Mimic is a valid *partial*: it is half a pair whose other half will name the species. Replace:
```js
function pkoSlotAccepts(markId, cards) {
  if (cards.length === 1) {
    // A lone Mimic is always a legal partial — the second tap names the species it
    // copies, and completeness is still pkoAnswers(), which rejects an all-Mimic pair.
    if (cards[0] === PKO_MIMIC_ID) return markId !== PKO_POACHER_ID;
    return pkoBeats(markId, cards[0])
        || (cards[0] === markId && markId !== PKO_POACHER_ID);
  }
  return pkoAnswers(markId, cards);
}
```

`pkoAutoFillSlot` — add a fourth priority so a tapped Mimic lands on a slot it can actually complete. Insert after priority 3:
```js
  //  4. else a Mimic starts a pair on the leftmost empty non-Poacher Mark
  if (slot === -1 && id === PKO_MIMIC_ID) {
    slot = pkoDraft.findIndex((g, i) => !g.length && pkoMarks[i] !== PKO_POACHER_ID);
  }
```

`pkoRejectionReason` — name the Mimic rule when a Mimic is what was refused. Insert after the track-lock line from Task 5:
```js
  if (cardId === PKO_MIMIC_ID) {
    return `A Mimic copies — it can’t act alone. Pair it with a real ${pkoCardName(markId)}.`;
  }
```

`pkoRenderChallenge`'s half-Swarm prompt (line 878-880) covers a lone Mimic already, but the message names the wrong card. Replace it:
```js
  const partial = pkoDraft.findIndex((g, i) => g.length === 1 && !pkoAnswers(pkoMarks[i], [sorted[g[0]]]));
  pkoChallengeHint(partial === -1 ? ''
    : (sorted[pkoDraft[partial][0]] === PKO_MIMIC_ID
        ? `Tap a real ${pkoCardName(pkoMarks[partial])} — that’s what the Mimic copies.`
        : `Tap one more ${pkoCardName(pkoMarks[partial])} to finish the Swarm.`));
```

- [ ] **Step 8: Add Invasive Mimicry to the deal**

Add to the Force of Nature section, after `pkoFireMigration`:
```js
// Invasive Mimicry — the fixed opener. Fires in pkoStartClash, NOT pkoStartEncounter:
// it mutates the DEAL, and players must see their full Hoard on the deal screen. It is
// DISPLAYED as Encounter 1's event, but the mutation happens before PKO_CLASH_BEGIN.
// Order matters and matches the brief exactly (§9): the base deal is Mimic-free, then
// 2n Mimics go into the Reserve, then everyone draws from the now Mimic-rich Reserve.
// Hoards are NOT refilled between Encounters — the bonus is once per Clash.
function pkoApplyInvasiveMimicry() {
  const n = pkoPlayerCount;
  for (let i = 0; i < 2 * n; i++) pkoReserve.push(PKO_MIMIC_ID);
  pkoReserve = shuffle(pkoReserve);
  // The brief's flat +5 was written against a 20-card Hoard and would be a 42% boost
  // against today's 12. Scaling holds it at ~25% across all three settings (D25).
  const bonus = Math.round(pkoHoardSize / PKO_FON_DEAL_BONUS_DIV);
  for (let i = 0; i < n; i++) pkoHoards[i].push(...pkoReserve.splice(0, bonus));
  pkoEvent       = 'invasive-mimicry';
  pkoEventsFired = ['invasive-mimicry'];
  pkoLogTrail(`Force of Nature — Invasive Mimicry. Everyone drew ${bonus} more cards `
    + 'from a Mimic-rich Reserve.');
}
```

In `pkoStartClash`, immediately after `pkoReserve = pool;` and **before** `pkoHoardCounts = pkoHoards.map(...)`:
```js
  if (pkoSyllyMode) pkoApplyInvasiveMimicry();
```
The counts line and `pkoSendPrivateHands()` both already sit below it, so both pick up the bonus cards with no further change. The `pkoEvent = null; pkoEventsFired = [];` reset added in Task 4 Step 6 must run **above** this call — check the ordering.

- [ ] **Step 9: Run all three harnesses**

```bash
node tools/verify-pko-chain.js && node tools/verify-pko-loop.js && node tools/verify-pko-events.js
```
Expected: all `ALL CHECKS PASSED`, chain 58, **loop still 123**. The loop harness never deals a Mimic, so if any of its checks move, `pkoResolveGroup` has changed behaviour for a Mimic-free group — most likely the C1 Poacher guard is unconditional. Re-read Step 4.

- [ ] **Step 10: Commit**

```bash
git add js/games/pko.js tools/verify-pko-events.js
git commit -m "feat(pko): the Mimic, and Invasive Mimicry on the deal

pkoResolveGroup is the only place a Mimic is interpreted; pkoAnswers routes
through it so the builder, the confirm gate, the table path and the host's
re-validation all inherit it. Appliers keep BOTH arrays — raw ids leave the
Hoard, resolved ids become the board. A Poacher claim is rejected only when a
Mimic is present, so a plain Poacher answer stays legal (Spec Correction C1).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: Alpha

One Mark is the Alpha, and **nothing played against it is discarded** — so the board compounds. Designated on the **opening Stake**, not at Encounter start: at Encounter start the board is empty, so the brief's wording has no referent (D29).

**Files:**
- Modify: `js/games/pko.js` — `pkoDiscardBoard`, `pkoApplyStake`, `pkoApplyChallenge`, `pkoApplyStampede`, `pkoEndEncounter`, `pkoBroadcastBoard`, the `PKO_BOARD` handler, `pkoRenderCard`, `pkoRenderTable`, `pkoRenderChallenge`
- Modify: `css/styles.css` (after `.pko-card-selected`, line 1651)
- Modify: `tools/verify-pko-events.js`

**Interfaces:**
- Consumes: `pkoEventFlag('alpha')` (Task 4), the resolved-array contract (Task 7).
- Produces: `pkoDiscardBoard(exceptIdx)` — `exceptIdx` defaults to `-1` (discard everything, the shipped behaviour); `pkoAlphaIdx` carried on `PKO_BOARD`. Task 9 consumes "a survived Alpha is not spoils".

- [ ] **Step 1: Write the failing checks**

Append to `tools/verify-pko-events.js`:

```js
  section('Alpha — designated on the opening Stake (D29)');
  F.seat({ hoards: [['mouse', 'mouse', 'mouse'], ['mongoose'], ['eagle']],
           turn: 0, event: 'alpha' });
  sandbox.pkoApplyStake(0, { cards: ['mouse', 'mouse', 'mouse'] });
  check('an Alpha index is assigned', F.alpha >= 0 && F.alpha < 3, true);
  check('the board is otherwise normal', F.marks, ['mouse', 'mouse', 'mouse']);
  F.seat({ hoards: [['mouse', 'mouse'], ['mongoose']], turn: 0, event: null });
  sandbox.pkoApplyStake(0, { cards: ['mouse', 'mouse'] });
  check('no Alpha event → no Alpha', F.alpha, -1);

  section('Alpha — the survivor is not discarded, so the board grows');
  F.seat({ hoards: [['bee'], ['mongoose', 'eagle', 'bear']],
           marks: ['mouse', 'mouse'], owner: 0, turn: 1, event: 'alpha', alphaIdx: 0 });
  sandbox.pkoApplyChallenge(1, { assignments: [['mongoose'], ['eagle']] });
  check('board grows by 1 on a normal beat — 2 played + 1 survivor', F.marks.length, 3);
  check('the survivor is on the board', F.marks.filter(c => c === 'mouse').length, 1);
  check('only the BEATEN Marks were discarded', F.wateringFlat, ['mouse']);
  check('the Alpha is reassigned within the new board', F.alpha >= 0 && F.alpha < 3, true);

  section('Swarming the Alpha grows the board by 2 (D30)');
  F.seat({ hoards: [['bee'], ['mouse', 'mouse', 'bear']],
           marks: ['mouse'], owner: 0, turn: 1, event: 'alpha', alphaIdx: 0 });
  sandbox.pkoApplyChallenge(1, { assignments: [['mouse', 'mouse']] });
  check('one Mark became three — both Swarm cards plus the survivor', F.marks.length, 3);
  check('nothing was discarded at all — the only Mark was the Alpha', F.wateringFlat, []);

  section('Stampede wipes the Alpha (brief §7)');
  F.seat({ hoards: [['bee'], ['mouse', 'mouse', 'mouse', 'bear']],
           marks: ['mouse', 'mouse'], owner: 0, turn: 1, event: 'alpha', alphaIdx: 1 });
  sandbox.pkoApplyStampede(1, { species: 'mouse', count: 3 });
  check('a Stampede replaces the board wholesale', F.marks, ['mouse', 'mouse', 'mouse']);
  check('the whole previous board went to the Watering Hole',
    F.wateringFlat, ['mouse', 'mouse']);
  check('the Alpha is cleared', F.alpha, -1);

  section('Alpha reassignment stays in range across repeated Challenges');
  F.seat({ hoards: [['bee'], ['mongoose', 'eagle', 'bear', 'elephant']],
           marks: ['mouse'], owner: 0, turn: 1, event: 'alpha', alphaIdx: 0 });
  sandbox.pkoApplyChallenge(1, { assignments: [['mongoose']] });
  const n1 = F.marks.length;
  check('after one Challenge the index is in range', F.alpha >= 0 && F.alpha < n1, true);
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node tools/verify-pko-events.js
```
Expected: FAIL on `an Alpha index is assigned` (`-1`), and on every board-growth check (the board is replaced wholesale today).

- [ ] **Step 3: Teach `pkoDiscardBoard` to spare one Mark**

Replace `js/games/pko.js:1117-1124`:

```js
// The spent board goes to the Watering Hole as ONE batch record, not loose cards, so the
// pile stays grouped by the play that spent it — which is how a real discard pile reads,
// and what the Discards tab renders. Every push site funnels through here so the shape
// can never drift between Challenge, Stampede and Encounter close.
// `exceptIdx` spares a single Mark: Force of Nature's Alpha survives whatever is played
// against it, so it is never spoils and never reaches the pile (§7.4).
function pkoDiscardBoard(exceptIdx) {
  const keep  = (exceptIdx === undefined ? -1 : exceptIdx);
  const cards = pkoMarks.filter((_, i) => i !== keep);
  if (!cards.length) return;
  pkoWateringHole.push({ enc: pkoEncounterNum, cards });
}
// Discard an explicit list rather than the live board. Used by the deferred Carrion
// path (Task 9), where the board has already been replaced by the time the leftovers
// are known. Same batch shape, so the Discards tab cannot tell the two apart.
function pkoDiscardCards(cards) {
  if (!cards || !cards.length) return;
  pkoWateringHole.push({ enc: pkoEncounterNum, cards: cards.slice() });
}
```

- [ ] **Step 4: Designate the Alpha on the opening Stake**

In `pkoApplyStake`, after `pkoMarkOwnerIdx = playerIdx;`:
```js
  // Designated on the opening STAKE, not at Encounter start: at Encounter start the
  // board is empty, so the brief's wording has no referent (D29). One random index.
  if (pkoEventFlag('alpha') && pkoMarks.length) {
    pkoAlphaIdx = Math.floor(Math.random() * pkoMarks.length);
    playSonarPing();
  }
```

- [ ] **Step 5: Let the Alpha survive a Challenge**

In `pkoApplyChallenge`, replace the mutation block from Task 7 Step 5:

```js
  const resolved = groups.map(g => pkoResolveGroup(g).resolved).flat();
  pkoRemoveFromHoard(playerIdx, flat);         // RAW
  // Alpha: the Alpha Mark is excluded from the discard, and the new board is everything
  // played PLUS the survivor. No special case for a Swarm — Alpha's rule is "nothing
  // played against the Alpha is discarded" and Swarm's is "each card becomes its own
  // Mark"; both already hold, so Swarming the Alpha grows the board by 2 (D30).
  const alphaLive = pkoAlphaIdx >= 0 && pkoAlphaIdx < pkoMarks.length;
  const survivor  = alphaLive ? pkoMarks[pkoAlphaIdx] : null;
  const beaten    = pkoMarks.filter((_, i) => i !== (alphaLive ? pkoAlphaIdx : -1));
  pkoDiscardBoard(alphaLive ? pkoAlphaIdx : -1);
  pkoMarks        = survivor === null ? resolved : resolved.concat([survivor]);
  pkoMarkOwnerIdx = playerIdx;
  if (alphaLive && pkoMarks.length) {
    // Reassign over the NEW board, the survivor included — compounding is Alpha's purpose.
    pkoAlphaIdx = Math.floor(Math.random() * pkoMarks.length);
    playSonarPing();
  }
```

`beaten` is unused until Task 9 — declare it here anyway so Carrion's insertion is a one-line change rather than a re-derivation, and so the "a survived Alpha is not spoils" rule is stated once, at the only place that knows which Mark survived.

- [ ] **Step 6: Clear the Alpha where the board is replaced wholesale**

`pkoApplyStampede` — after `pkoMarkOwnerIdx = playerIdx;`:
```js
  pkoAlphaIdx = -1;                             // a Stampede replaces the board wholesale
```
(its `pkoDiscardBoard()` call already passes no argument, so the whole previous board is discarded — including the Alpha. That is brief §7's existing ruling.)

`pkoEndEncounter` — after `pkoMarks = [];`:
```js
  pkoAlphaIdx = -1;                             // the board is gone; so is its Alpha
```

- [ ] **Step 7: Sync and render the Alpha**

`pkoBroadcastBoard` — add to the payload:
```js
    alphaIdx: pkoAlphaIdx,
```
`case 'PKO_BOARD':` — add alongside the other reads:
```js
      pkoAlphaIdx       = p.alphaIdx === undefined ? -1 : p.alphaIdx;
```

`pkoRenderCard` — implement the `opts.alpha` that has been documented as reserved since v1. Add to **both** the asset branch and the emoji branch, right where `state` is used. Change the `state` line (line 224):
```js
  const state = (opts.selected ? ' pko-card-selected' : '') + (opts.alpha ? ' pko-card-alpha' : '');
```
and add `state` to the emoji-fallback className (line 235), which currently omits it:
```js
  el.className = 'pko-card' + track + state;
```
(the asset branch at line 229 already concatenates `state`, so it needs no further edit).

`pkoRenderTable`'s Marks row (line 515):
```js
      pkoMarks.forEach((id, i) => marks.appendChild(pkoRenderCard(id, { alpha: i === pkoAlphaIdx })));
```
`pkoRenderChallenge`'s Marks row (line 791-795):
```js
    pkoMarks.forEach((id, i) => {
      const card = pkoRenderCard(id, { size: 'sm', alpha: i === pkoAlphaIdx });
      pkoBindChainHold(card, id);
      marksEl.appendChild(card);
    });
```

- [ ] **Step 8: Add the Alpha's CSS**

`css/styles.css`, after `.pko-card-selected` (line 1651). A crown and a glow, not art — 8 events × bitmaps is not worth the install weight (§14). Transform/opacity only, and the global reduced-motion block already collapses the pulse.

```css
/* Force of Nature — the Alpha Mark. Crown + glow, never art (§14). The ::after crown
   sits outside the card box so it survives the asset-pack background-image branch. */
.pko-card-alpha {
  outline: 3px solid #C9A227;
  outline-offset: 2px;
  box-shadow: 0 0 12px 2px rgba(201, 162, 39, 0.55);
  position: relative;
}
.pko-card-alpha::after {
  content: '👑';
  position: absolute;
  top: -0.7rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.95rem;
  line-height: 1;
  pointer-events: none;
}
```

- [ ] **Step 9: Run all three harnesses**

```bash
node tools/verify-pko-chain.js && node tools/verify-pko-loop.js && node tools/verify-pko-events.js
```
Expected: all `ALL CHECKS PASSED`, chain 58, **loop still 123**. With no Alpha event live, `pkoAlphaIdx` is `-1`, `alphaLive` is false, and `pkoDiscardBoard(-1)` discards everything — exactly the shipped behaviour. If a loop check moves, `pkoDiscardBoard`'s default is wrong: `pkoDiscardBoard()` with no argument must spare nothing.

- [ ] **Step 10: Commit**

```bash
git add js/games/pko.js css/styles.css tools/verify-pko-events.js
git commit -m "feat(pko): Alpha — one Mark survives whatever is played against it

Designated on the opening Stake (D29). pkoDiscardBoard gains an exceptIdx;
the board grows by 1 on a normal beat and by 2 on a Swarm with no special case
(D30). Implements the opts.alpha that pkoRenderCard reserved in v1.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 9: Carrion

The Challenger may take back some of the Marks they just beat. **The window resolves the selection, it does not cancel it** — on expiry whatever is selected is kept and the rest discarded, so selecting nothing (including doing nothing at all) is exactly the shipped non-Carrion behaviour. A slow player is never punished, only unlucky; a player who taps two cards and freezes still gets those two.

**Spec gap (C5):** §11's handler audit lists only the `PKO_CARRION` **ACTION**. But the Challenger may be a client, and the host is the only device that knows the window opened — so the host also needs a **`PKO_CARRION_OPEN` SYNC** to put the overlay on the Challenger's screen (and a waiting line on everyone else's). Without it the overlay only ever appears when the host happens to be the Challenger, which is BUG-02's shape exactly. Add it, and record the gap in the impl-notes at Task 12.

**Files:**
- Modify: `js/games/pko.js` — `pkoAfterBoardChange`, `pkoApplyChallenge`, `pkoApplyStake`, `pkoApplyStampede`, `pkoHandleEnvelope`, the wiring block, `pkoResetState`
- Modify: `index.html` (new `pko-carrion-overlay` after `pko-stampede-overlay`, which ends line 8982)
- Modify: `js/engine.js:628-629` (overlay teardown list)
- Modify: `css/styles.css` (countdown bar)
- Modify: `tools/verify-pko-events.js`

**Interfaces:**
- Consumes: `pkoEventFlag('carrion')` (Task 4), the `beaten` array and `pkoDiscardCards` (Task 8).
- Produces: `pkoOpenCarrion(playerIdx, spoils)`, `pkoResolveCarrion(playerIdx, keepIdxs)`, `pkoSubmitCarrion()`. `pkoAfterBoardChange(playerIdx, spoils)` gains a second parameter — **`spoils` is `undefined` for Stake and Stampede**, so only a Challenge can offer Carrion (§2's flow diagram; a Stampede is a rout, not a hunt).

- [ ] **Step 1: Write the failing checks**

Append to `tools/verify-pko-events.js`:

```js
  section('Carrion — never offered on a hand-emptying Challenge (§7.5)');
  F.seat({ hoards: [['bee'], ['mongoose']], marks: ['mouse'], owner: 0, turn: 1,
           event: 'carrion', scores: [0, 0] });
  F.set('clashTarget', 9);
  sandbox.pkoApplyChallenge(1, { assignments: [['mongoose']] });
  check('emptying the Hoard wins the Clash outright', F.scores, [0, 1]);
  check('Carrion was never opened — the empty-Hoard check comes first', F.carrionOpen, false);

  section('Carrion — the spoils are the Marks that were actually beaten');
  F.seat({ hoards: [['bee'], ['mongoose', 'bear']], marks: ['mouse'], owner: 0, turn: 1,
           event: 'carrion' });
  sandbox.pkoApplyChallenge(1, { assignments: [['mongoose']] });
  check('the window is open', F.carrionOpen, true);
  check('the spoils are the beaten Marks', F.carrionSpoils, ['mouse']);
  check('the beaten Marks are NOT yet in the Watering Hole', F.wateringFlat, []);

  section('Carrion — keeping a card puts it back in the Hoard');
  sandbox.pkoResolveCarrion(1, [0]);
  check('the kept card joined the Challenger’s Hoard', F.hoards[1].sort(), ['bear', 'mouse']);
  check('nothing was discarded', F.wateringFlat, []);
  check('play resumed — the board is the Challenge', F.marks, ['mongoose']);
  check('the window closed', F.carrionOpen, false);

  section('Carrion — keeping nothing is exactly the shipped behaviour');
  F.seat({ hoards: [['bee'], ['mongoose', 'bear']], marks: ['mouse'], owner: 0, turn: 1,
           event: 'carrion' });
  sandbox.pkoApplyChallenge(1, { assignments: [['mongoose']] });
  sandbox.pkoResolveCarrion(1, []);
  check('everything beaten went to the Watering Hole', F.wateringFlat, ['mouse']);
  check('the Hoard is untouched', F.hoards[1], ['bear']);
  check('play resumed', F.marks, ['mongoose']);

  section('Carrion — a partial keep splits the spoils');
  F.seat({ hoards: [['bee'], ['mongoose', 'eagle', 'bear']],
           marks: ['mouse', 'fish'], owner: 0, turn: 1, event: 'carrion' });
  sandbox.pkoApplyChallenge(1, { assignments: [['mongoose'], ['eagle']] });
  sandbox.pkoResolveCarrion(1, [1]);
  check('the kept Mark returned', F.hoards[1].sort(), ['bear', 'fish']);
  check('the rest was discarded', F.wateringFlat, ['mouse']);

  section('Carrion — the race guard drops the second resolution (ML-05)');
  F.seat({ hoards: [['bee'], ['mongoose', 'bear']], marks: ['mouse'], owner: 0, turn: 1,
           event: 'carrion' });
  sandbox.pkoApplyChallenge(1, { assignments: [['mongoose']] });
  sandbox.pkoResolveCarrion(1, [0]);
  sandbox.pkoResolveCarrion(1, [0]);            // a client ACTION landing after the timer
  check('the card is returned exactly once', F.hoards[1].sort(), ['bear', 'mouse']);
  check('the board was not advanced twice', F.marks, ['mongoose']);

  section('Carrion — a survived Alpha is not spoils (§7.5)');
  F.seat({ hoards: [['bee'], ['mongoose', 'eagle', 'bear']],
           marks: ['mouse', 'fish'], owner: 0, turn: 1, event: 'carrion', alphaIdx: 0 });
  // The Alpha event is not live (carrion is), so alphaIdx is inert here by design —
  // this asserts the two never stack a survivor into the spoils.
  sandbox.pkoApplyChallenge(1, { assignments: [['mongoose'], ['eagle']] });
  check('every offered spoil was genuinely beaten',
    F.carrionSpoils.every(c => ['mouse', 'fish'].includes(c)), true);
  sandbox.pkoResolveCarrion(1, []);

  section('Carrion is never offered by a Stake or a Stampede (§2)');
  F.seat({ hoards: [['mouse', 'mouse', 'bear'], ['bee']], turn: 0, event: 'carrion' });
  sandbox.pkoApplyStake(0, { cards: ['mouse', 'mouse'] });
  check('a Stake beats nothing, so there is nothing to scavenge', F.carrionOpen, false);
  F.seat({ hoards: [['bee'], ['mouse', 'mouse', 'mouse', 'bear']],
           marks: ['mouse', 'mouse'], owner: 0, turn: 1, event: 'carrion' });
  sandbox.pkoApplyStampede(1, { species: 'mouse', count: 3 });
  check('a Stampede is a rout, not a hunt', F.carrionOpen, false);
  check('the Stampede discarded the board immediately', F.wateringFlat, ['mouse', 'mouse']);
```

Add the two accessors these need to the `BRIDGE`:
```js
  get carrionOpen()   { return pkoCarrionPending !== null; },
  get carrionSpoils() { return pkoCarrionPending ? pkoCarrionPending.spoils : null; },
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node tools/verify-pko-events.js
```
Expected: `ReferenceError: pkoCarrionPending is not defined` from the bridge getter.

- [ ] **Step 3: Add the pending-window state**

Beside the other Force of Nature state (Task 4 Step 1):
```js
let pkoCarrionPending = null;         // HOST ONLY: { playerIdx, spoils[] } while the window is open
```
and clear it in `pkoResetState`, on the same line as `pkoCarrionSel`:
```js
  pkoEvent = null; pkoEventsFired = []; pkoAlphaIdx = -1;
  pkoCarrionSel = []; pkoCarrionPending = null;
```

- [ ] **Step 4: Thread the spoils through `pkoAfterBoardChange`**

Replace `js/games/pko.js:1141-1154`:

```js
// Every successful board change funnels through here — Stake, Challenge and Stampede
// all end the same way, so the Clash-end check and the window reset live in ONE place.
// `spoils` is the Marks this play actually BEAT, and only a Challenge passes it: a Stake
// beats nothing and a Stampede is a rout that discards the board wholesale (§2).
function pkoAfterBoardChange(playerIdx, spoils) {
  // Clash end fires BEFORE the board resolves (§6): emptying your Hoard wins immediately,
  // whether you emptied it Staking, Challenging or Stampeding. Carrion sits BELOW this
  // line on purpose — that placement, not a new rule, is what stops Carrion un-winning a
  // Clash (§7.5). Do not reorder it.
  if ((pkoHoards[playerIdx] || []).length === 0) { pkoResolveClash([playerIdx]); return; }
  if (spoils && spoils.length && pkoEventFlag('carrion')) { pkoOpenCarrion(playerIdx, spoils); return; }
  pkoResumeAfterBoardChange(playerIdx);
}

// The tail of a board change, split out so the Carrion window can defer it.
function pkoResumeAfterBoardChange(playerIdx) {
  // The response window restarts clockwise from the player after the one who changed
  // the board, and every Retreat is forgiven — a Retreat is not a lock-out.
  pkoRetreatedSince = new Array(pkoPlayerCount).fill(false);
  pkoTurnIdx        = playerIdx;
  pkoAdvanceTurn();
  pkoBroadcastBoard();
  pkoShowTable();
}
```

In `pkoApplyChallenge`, change the **discard** so the spoils survive until Carrion resolves, and pass them on. Replace the `pkoDiscardBoard(...)` line from Task 8 Step 5 and the closing call:
```js
  const carrion = !!pkoEventFlag('carrion');
  if (!carrion) pkoDiscardBoard(alphaLive ? pkoAlphaIdx : -1);   // normal: straight to the pile
  ...
  pkoAfterBoardChange(playerIdx, carrion ? beaten : undefined);
```
`pkoApplyStake` and `pkoApplyStampede` keep calling `pkoAfterBoardChange(playerIdx)` with one argument — `spoils` is `undefined` there and Carrion can never fire.

- [ ] **Step 5: Open and resolve the window**

Add after `pkoResumeAfterBoardChange`:

```js
// ── Force of Nature — Carrion (§7.5) ──────────────────────────────────────
// Host: hold the beaten Marks open for PKO_CARRION_WINDOW_MS while the Challenger picks
// which to take back. The Challenger may be a client, so the host must SYNC the window
// open — it is the only device that knows it happened (spec gap C5).
function pkoOpenCarrion(playerIdx, spoils) {
  pkoCarrionPending = { playerIdx, spoils: spoils.slice() };
  pkoLogTrail(`${pkoPlayerNames[playerIdx]} may scavenge ${pkoSummariseCards(spoils)}.`);
  if (window.syllyMultiplayerMode !== 'single') {
    mpSendEnvelope({ type: 'SYNC', payload: {
      action: 'PKO_CARRION_OPEN', playerIdx, spoils,
      marks: pkoMarks, markOwnerIdx: pkoMarkOwnerIdx, alphaIdx: pkoAlphaIdx,
      hoardCounts: pkoHoardCounts, trail: pkoTrail,
    }});
  }
  pkoShowCarrion(playerIdx, spoils);
  if (pkoCarrionTimer) clearTimeout(pkoCarrionTimer);
  // The host's timer is the backstop. Whichever lands first — this or the Challenger's
  // PKO_CARRION packet — resolves; pkoResolveCarrion drops the second (ML-05).
  pkoCarrionTimer = setTimeout(() => {
    pkoCarrionTimer = null;
    if (pkoCarrionPending) pkoResolveCarrion(pkoCarrionPending.playerIdx, pkoCarrionSelForHost());
  }, PKO_CARRION_WINDOW_MS);
}

// What the host itself has selected, when the host IS the Challenger. A client's choice
// arrives in the packet instead.
function pkoCarrionSelForHost() {
  return (pkoCarrionPending && pkoCarrionPending.playerIdx === pkoMyIdx()) ? pkoCarrionSel : [];
}

// Host: resolve the window. Kept Marks rejoin the Challenger's Hoard, the rest go to the
// Watering Hole, and the deferred board change resumes. Selecting nothing — including
// doing nothing at all — discards everything, which is exactly the shipped non-Carrion
// behaviour, so a slow player is never punished, only unlucky.
function pkoResolveCarrion(playerIdx, keepIdxs) {
  if (window.syllyMultiplayerMode === 'client') return;
  if (!pkoCarrionPending || pkoCarrionPending.playerIdx !== playerIdx) return;  // race guard (ML-05)
  const { spoils } = pkoCarrionPending;
  pkoCarrionPending = null;
  if (pkoCarrionTimer) { clearTimeout(pkoCarrionTimer); pkoCarrionTimer = null; }
  pkoClose('pko-carrion-overlay');

  const keep = (keepIdxs || []).filter(i => i >= 0 && i < spoils.length);
  const kept = keep.map(i => spoils[i]);
  const rest = spoils.filter((_, i) => !keep.includes(i));
  if (kept.length) {
    pkoHoards[playerIdx].push(...kept);
    pkoSyncHand(playerIdx);                     // the Hoard changed — repair the owning device
    playSuccess();
    pkoLogTrail(`${pkoPlayerNames[playerIdx]} scavenged ${pkoSummariseCards(kept)}.`);
  }
  pkoDiscardCards(rest);                        // the board was already replaced — discard by list
  pkoCarrionSel = [];
  pkoResumeAfterBoardChange(playerIdx);
}

// The Challenger's tap on "Take these". Host-as-participant: the host mutates directly
// and broadcasts — never a self-sent ACTION (the dedup guard drops originId === self).
function pkoSubmitCarrion() {
  if (!pkoEventFlag('carrion')) return;
  const me = pkoMyIdx();
  if (window.syllyMultiplayerMode === 'client') {
    mpLockSync();
    mpSendEnvelope({ type: 'ACTION', payload: { action: 'PKO_CARRION', keep: pkoCarrionSel } });
    pkoClose('pko-carrion-overlay');
    return;
  }
  pkoResolveCarrion(me, pkoCarrionSel);
}
```

- [ ] **Step 6: Render the window**

Add beside the other renderers:
```js
// The Challenger taps Marks to toggle them into the keep set; everyone else waits.
// The countdown bar is a CSS transition on transform, so it needs no timer of its own.
function pkoShowCarrion(playerIdx, spoils) {
  pkoCarrionSel = [];
  const mine = playerIdx === pkoMyIdx();
  const row  = document.getElementById('pko-carrion-row');
  if (row) {
    row.innerHTML = '';
    spoils.forEach((id, i) => {
      const card = pkoRenderCard(id, { size: 'sm' });
      if (mine) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
          const at = pkoCarrionSel.indexOf(i);
          if (at === -1) pkoCarrionSel.push(i); else pkoCarrionSel.splice(at, 1);
          playPillClick();
          pkoShowCarrionSelection(spoils);
        });
      }
      row.appendChild(card);
    });
  }
  const btn  = document.getElementById('btn-pko-carrion-take');
  const wait = document.getElementById('pko-carrion-waiting');
  if (btn)  btn.style.display  = mine ? 'flex' : 'none';
  if (wait) wait.style.display = mine ? 'none' : 'block';
  if (wait) wait.textContent = `${pkoPlayerNames[playerIdx] || '—'} is picking over the remains…`;
  const bar = document.getElementById('pko-carrion-bar');
  if (bar) {                                    // restart the transition — reflow or it no-ops
    bar.style.transition = 'none';
    bar.style.transform  = 'scaleX(1)';
    void bar.offsetWidth;
    bar.style.transition = `transform ${PKO_CARRION_WINDOW_MS}ms linear`;
    bar.style.transform  = 'scaleX(0)';
  }
  pkoShowCarrionSelection(spoils);
  pkoOpen('pko-carrion-overlay');
}

function pkoShowCarrionSelection(spoils) {
  const row = document.getElementById('pko-carrion-row');
  if (row) [...row.children].forEach((el, i) =>
    el.classList.toggle('pko-card-selected', pkoCarrionSel.includes(i)));
  const btn = document.getElementById('btn-pko-carrion-take');
  if (btn) btn.textContent = pkoCarrionSel.length
    ? `Take ${pkoCarrionSel.length} ${pkoCarrionSel.length === 1 ? 'card' : 'cards'}`
    : 'Leave it all';
}
```

- [ ] **Step 7: Wire the packets**

`pkoHandleEnvelope`, in the ACTION switch:
```js
      case 'PKO_CARRION':     pkoResolveCarrion(senderIdx(), p.keep || []); break;
```
and a new SYNC case, beside `PKO_BOARD`:
```js
    case 'PKO_CARRION_OPEN':
      pkoMarks        = p.marks || [];
      pkoMarkOwnerIdx = p.markOwnerIdx;
      pkoAlphaIdx     = p.alphaIdx === undefined ? -1 : p.alphaIdx;
      pkoHoardCounts  = p.hoardCounts || pkoHoardCounts;
      pkoTrail        = p.trail || pkoTrail;
      pkoDismissChallenge();
      pkoShowCarrion(p.playerIdx, p.spoils || []);
      mpUnlockSync();
      break;
```
> No client-side timer here. The host owns the window's clock and closes it with `PKO_BOARD` (via `pkoResumeAfterBoardChange`), so a client whose packet was dropped is still moved on by the board rebroadcast — the same self-correcting shape as everywhere else in this file.

The wiring block (`DOMContentLoaded`):
```js
  on('btn-pko-carrion-take', () => pkoSubmitCarrion());
```

- [ ] **Step 8: Add the overlay markup and its teardown**

`index.html` — insert after `pko-stampede-overlay`'s closing `</div>` (line 8982), before `<!-- PKO NEW MATCH -->`. Decision modal, z-[90], border **`border-[#E4CFA3]`** matching `pko-quit-overlay` (Spec Correction C3).

```html
  <!-- PKO CARRION (Force of Nature — timed spoils window) -->
  <div id="pko-carrion-overlay" style="display:none"
    class="fixed inset-0 z-[90] overlay-modal-backdrop flex items-center justify-center px-6">
    <div class="overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center border border-[#E4CFA3]">
      <div class="flex flex-col gap-2">
        <p class="text-3xl">🦅</p>
        <h3 class="text-lg font-bold text-stone-800">Carrion — take the spoils?</h3>
        <p class="text-stone-500 text-sm">Tap what you want back. Whatever you've picked when the clock runs out is yours; the rest goes to the Watering Hole.</p>
      </div>
      <div id="pko-carrion-row" class="flex gap-1.5 justify-center flex-wrap"></div>
      <div class="pko-carrion-track"><div id="pko-carrion-bar" class="pko-carrion-bar"></div></div>
      <button id="btn-pko-carrion-take" style="display:none"
        class="btn-mp-action pko-cta min-h-14 w-full rounded-2xl text-white font-semibold text-lg active:scale-95 transition-all duration-150">Leave it all</button>
      <p id="pko-carrion-waiting" style="display:none" class="text-stone-400 text-xs">—</p>
    </div>
  </div>
```

`js/engine.js:628-629` — add the overlay to PKO's teardown list:
```js
  ['pko-settings-overlay','pko-challenge-overlay','pko-how-to-overlay','pko-chain-overlay',
   'pko-trail-overlay','pko-quit-overlay','pko-stampede-overlay','pko-new-match-overlay',
   'pko-carrion-overlay'].forEach(id => {
```

`css/styles.css`, after the `.pko-card-alpha` rules from Task 8:
```css
/* Carrion countdown. transform only — the global prefers-reduced-motion block collapses
   the duration, which is correct here: the bar is decoration, the host owns the clock. */
.pko-carrion-track { height: 0.375rem; width: 100%; border-radius: 999px; background: #EDE7DC; overflow: hidden; }
.pko-carrion-bar   { height: 100%; width: 100%; border-radius: 999px; background: #C9A227; transform-origin: left center; }
```

- [ ] **Step 9: Run all three harnesses**

```bash
node tools/verify-pko-chain.js && node tools/verify-pko-loop.js && node tools/verify-pko-events.js
```
Expected: all `ALL CHECKS PASSED`, chain 58, **loop still 123**. With no Carrion event live, `pkoApplyChallenge` discards immediately and passes `undefined` spoils, so `pkoAfterBoardChange` behaves exactly as before. If a loop check fails on the Watering Hole, the `if (!carrion)` guard on `pkoDiscardBoard` is inverted.

- [ ] **Step 10: Commit**

```bash
git add js/games/pko.js js/engine.js index.html css/styles.css tools/verify-pko-events.js
git commit -m "feat(pko): Carrion — a timed window on the spoils of a kill

The window RESOLVES the selection rather than cancelling it, so doing nothing is
exactly the shipped behaviour (D31). Sits below the empty-Hoard check so it can
never un-win a Clash (§7.5). Adds PKO_CARRION_OPEN — the Challenger may be a
client, and the host is the only device that knows the window opened (gap C5).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 10: Copy — settings, how-to, and the chain reference

Three strings currently describe an unbuilt feature ("Arriving in a later update", "Dark Forest"), and the chain overlay would tell an outright lie about the Mimic. All are single targeted `Edit` calls against `index.html` — **never a scripted sweep** (UTF-8 mojibake).

**Files:**
- Modify: `index.html:8787` (settings card body), `:8904` (how-to Sylly card body)
- Modify: `js/games/pko.js` — `pkoRenderChain`
- Modify: `.claude/rules/ui-style.md` (Table B footnote ‡)

**Interfaces:**
- Consumes: nothing. Produces: nothing. Pure copy — no harness movement expected.

- [ ] **Step 1: Rewrite the settings card body**

`index.html:8787` — replace the single `<p class="text-stone-400 text-sm">…</p>`:

```html
          <p class="text-stone-400 text-sm">Before each Encounter, a random event reshapes the rules — the chain flips, a species is wiped out, or everyone swaps Hoards. Mimic cards join the deck. Not recommended for your first game.</p>
```

- [ ] **Step 2: Rewrite the how-to Sylly Mode card**

`index.html:8904` — replace the single `<p class="text-stone-500 text-sm">…</p>`:

```html
          <p class="text-stone-500 text-sm">Every Clash opens with <span class="font-semibold text-stone-700">Invasive Mimicry</span> — Mimics join the Pool and everyone draws a few extra. After that, each Encounter opens on one of eight events: <span class="font-semibold text-stone-700">The Culling</span>, <span class="font-semibold text-stone-700">The Great Reversal</span>, <span class="font-semibold text-stone-700">The Deluge</span>, <span class="font-semibold text-stone-700">The Dry Season</span>, <span class="font-semibold text-stone-700">Extinction Event</span>, <span class="font-semibold text-stone-700">Migration</span>, <span class="font-semibold text-stone-700">Alpha</span> or <span class="font-semibold text-stone-700">Carrion</span>. A <span class="font-semibold text-stone-700">Mimic</span> copies whatever it's played with, so it always needs a real animal beside it — and it can never copy a Poacher.</p>
```

Dark Forest is gone from the copy because it was cut (D26). Nine events named to the player: the fixed opener plus the eight random ones.

- [ ] **Step 3: Give the Mimic an honest line in the chain reference**

`pkoRenderChain` (line 1791-1795) currently falls through to "Nothing in the chain beats it. Only a Poacher — or a Swarm", which is wrong for a card that never becomes a Mark. Replace the `b.textContent` assignment:

```js
    const preds = [...(pkoPredators(e.id) || [])];
    b.textContent = e.id === PKO_MIMIC_ID
      ? 'Copies whatever it’s played with. Never alone, never a Poacher, and it never becomes a Mark.'
      : preds.length
        ? 'Beaten by ' + preds.map(pkoCardName).join(', ')
        : (e.id === PKO_POACHER_ID ? 'Answers to no one. Wins any one Mark outright.'
                                   : 'Nothing in the chain beats it. Only a Poacher — or a Swarm.');
```

The Mimic row appears automatically — `pkoRenderChain` iterates `Object.values(pkoChain)`, and Task 1 appended the entry last.

Also note the Great Reversal in the mode line at the head of the overlay, so the reference never lags a live rule. Replace the `mode.textContent` assignment (line 1773-1775):

```js
  const revNote = pkoEventFlag('reversal') ? ' The Great Reversal is live — the chain runs backwards.' : '';
  mode.textContent = (pkoAppetite === 'ravenous'
    ? 'Ravenous — a predator also eats two tiers below it. Plus: two of a Mark’s own kind Swarm it.'
    : 'Sated — you only ever eat your direct prey. Plus: two of a Mark’s own kind Swarm it.') + revNote;
```
This overlay *is* the rules; it must not paraphrase them or lag behind a setting — and now, nor behind an event. `pkoPredators` already returns the reversed set, so the per-row "Beaten by …" lines were correct from Task 5; only the header needed telling.

- [ ] **Step 4: Remove the ‡ footnote**

`.claude/rules/ui-style.md`, § Per-Game Reference → Table B. In the PKO row, change `Force of Nature ‡` to `Force of Nature`, and delete the footnote line:
```
**‡  PKO's Sylly Mode ships live but inert** — Force of Nature deferred to Phase 2 (PKO spec §16 Q7).
```

- [ ] **Step 5: Verify the copy renders and nothing else moved**

```bash
node -e "const s=require('fs').readFileSync('index.html','utf8'); ['Arriving in a later update','Dark Forest'].forEach(t=>console.log(t, s.includes(t)?'STILL PRESENT — FAIL':'gone'));"
node tools/verify-pko-chain.js && node tools/verify-pko-loop.js && node tools/verify-pko-events.js
```
Expected: both strings `gone`; all three harnesses `ALL CHECKS PASSED`.

Then open `index.html` in a browser, enter PKO from the lobby, and check the settings and how-to overlays render with no mojibake (look for `â€”` where an em dash should be). If any appears, `git checkout index.html` and redo the edit — do not patch the mojibake in place.

- [ ] **Step 6: Commit**

```bash
git add index.html js/games/pko.js .claude/rules/ui-style.md
git commit -m "docs(pko): Force of Nature copy — settings, how-to, chain reference

The three strings described an unbuilt feature and named Dark Forest, which was
cut (D26). The chain overlay now tells the truth about the Mimic and flags a
live Great Reversal. Removes the 'ships live but inert' footnote from Table B.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 11: Documentation Integrity Protocol closure

Binding, and it runs **before** any phase snapshot. Six documents, in this order.

**Files:** `docs/code-map.md`, `docs/rules/game-identities.md`, `CLAUDE.md`, `.claude/rules/logic-engine.md`, `docs/implementation-notes/pko-implementation-notes.md`, `docs/decision-log.md`, `docs/sw-changelog.md`

- [ ] **Step 1: `docs/code-map.md`**

Grep `screen-pko-` and `pkoResolveClash` to find PKO's blocks, then add — never full-read the file (~132 KB):
- Screens: `screen-pko-event` (interstitial, 2.5 s, both sides time locally off `PKO_ENCOUNTER_BEGIN`)
- Overlays: `pko-carrion-overlay` (decision modal, z-[90])
- State: `pkoEvent`, `pkoEventsFired`, `pkoAlphaIdx`, `pkoCarrionSel`, `pkoCarrionPending`, `pkoEventTimer`, `pkoCarrionTimer`
- Functions: `PKO_EVENTS`, `pkoEventFlag`, `pkoCanActUnderTrack`, `pkoTrackOk`, `pkoTrackReason`, `pkoDrawEvent`, `pkoShowEvent`, `pkoResolveGroup`, `pkoStampedeSpend`, `pkoFireCulling`, `pkoFireExtinction`, `pkoFireMigration`, `pkoApplyInvasiveMimicry`, `pkoSyncHand`, `pkoSyncAllHands`, `pkoNextOpener`, `pkoDiscardCards`, `pkoResumeAfterBoardChange`, `pkoOpenCarrion`, `pkoResolveCarrion`, `pkoSubmitCarrion`, `pkoShowCarrion`
- Changed signatures: `pkoResolveClash(winnerIdxs)` (done in Task 3 Step 8), `pkoDiscardBoard(exceptIdx)`, `pkoAfterBoardChange(playerIdx, spoils)`
- Packet table: `PKO_CARRION` (ACTION), `PKO_CARRION_OPEN` (SYNC); `PKO_CLASH_END`/`PKO_MATCH_END` now carry `winnerIdxs[]`; `PKO_CLASH_BEGIN`/`PKO_ENCOUNTER_BEGIN` carry `event`/`eventsFired`/`alphaIdx`; `PKO_BOARD` carries `alphaIdx`

- [ ] **Step 2: `docs/rules/game-identities.md` § Game 17**

Grep `## Game 17` and offset-Read only that section (the file is 135 KB). Replace the **"Phase 2 design record"** paragraph with the shipped ruleset: the nine events and what each does, the Mimic's one rule, the Invasive Mimicry deal table (10→13 / 12→15 / 15→19), the Carrion window, and the Alpha. Add the Mimic to the chain table. Add the FoN vocabulary (Force of Nature, Mimic, Alpha, Carrion, spoils, The Culling, Extinction Event, Migration, The Great Reversal, The Deluge, The Dry Season, Invasive Mimicry).

- [ ] **Step 3: `CLAUDE.md`**

- SW version → v149 (two places: § Current Focus and the `**SW Version:**` line)
- § Current Focus: Force of Nature is **shipped**, not deferred. Delete the "ships live but inert (documented exception, spec §16 Q7)" claim and the "needs its own Stage 2 tech-spec pass before it's built" paragraph.
- Note the three harnesses and their counts.

- [ ] **Step 4: `.claude/rules/logic-engine.md`**

- **Current SW version:** v149 (two places — the § PWA Guardian line and the header)
- Audio catalogue: no new functions, but add a line noting `playAbyssThud`/`playWhoosh`/`playSonarPing`/`playSuccess`/`playDone` are reused by Force of Nature events via `PKO_EVENT_SOUND`.
- If, and only if, a rule here proved wrong during the build, correct it — otherwise leave the file alone.

- [ ] **Step 5: `docs/implementation-notes/pko-implementation-notes.md`**

Add under Design Decisions: **D25–D34** (from FoN spec §17, one line each). Add under Template Gaps or Bug Index, whichever fits:
- **Spec Correction C1** — an unconditional Poacher-claim rejection in a group resolver silently outlaws the plain Poacher play. *Lesson: when a new resolver is inserted in front of an existing predicate, enumerate the inputs that were legal before it and assert each one is still legal — the harness section "pkoAnswers is unchanged for every Mimic-free input" is that assertion.*
- **Spec Correction C4** — a Stage 2 spec claimed a harness "must be rewritten"; it never called the changed function. *Lesson: verify a spec's claims about test coverage against the test file before planning work around them.*
- **Spec gap C5** — the missing-handler audit found the ACTION but not the SYNC that opens the phase. *Lesson: the audit question is two-sided. "Can a non-host device submit here?" needs its twin, "can a non-host device even SEE this phase?" — the host is the only device that knows a host-side event happened.*

- [ ] **Step 6: `docs/decision-log.md`**

One entry, newest on top, ~4 lines: Force of Nature shipped — Dark Forest cut (D26), multi-scorer Clash resolution (`pkoResolveClash(winnerIdxs)`), and the Mimic resolved at play time so `pkoBeats`/`pkoMarks` were untouched (D33). Pointer, not a deep doc.

- [ ] **Step 7: `docs/sw-changelog.md`**

Add v149 notes at the top: Force of Nature. Name the 9 events, the Mimic, the two new UI surfaces, the `pkoResolveClash` signature change, and the third harness.

- [ ] **Step 8: Commit**

```bash
git add docs/ CLAUDE.md .claude/rules/logic-engine.md
git commit -m "docs(pko): Documentation Integrity Protocol closure for Force of Nature

code-map, game-identities Game 17, CLAUDE.md, logic-engine, impl-notes D25-D34
plus C1/C4/C5 lessons, decision-log, sw-changelog v149.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 12: Three-device playtest — a non-host player moves first

**TG-07 binds and no harness can substitute.** A single-process harness runs in `'single'` mode where `pkoMyHoard` *aliases* `pkoHoards[0]`, so it is structurally blind to per-device mirror bugs — which is exactly how BUG-02 survived 75 green checks. The Mimic's raw-vs-resolved removal and the three new `pkoSyncAllHands()` senders are that same class.

**Prerequisite:** all three harnesses green.
```bash
node tools/verify-pko-chain.js && node tools/verify-pko-loop.js && node tools/verify-pko-events.js
```

- [ ] **Step 1: Deploy and hard-refresh every device**

Push, then on each of the three devices hard-refresh (or uninstall/reinstall the PWA) and confirm the Service Worker reports **v149**. A device on v148 will desync in ways that look like logic bugs.

- [ ] **Step 2: Host a lobby with Force of Nature ON, three players**

Settings: Sylly Mode **ON**, everything else default (Clashes 3, Hoard 12, Poacher One Each, Small Fry Match Start, Appetite Sated, Scavenge off).

Expected on the deal screen: **15 cards each** (12 base + 3 bonus), some of them Mimics, and the Invasive Mimicry interstitial on Encounter 1.

- [ ] **Step 3: The first turn is taken by a NON-HOST player**

Not the host. This is the whole point — host-as-participant means the host path proves nothing about clients, and it is how BUG-02 hid. If the random leader is the host, Retreat is not available on an empty board, so instead: let the host Stake, then confirm a **client** can Challenge it.

Confirm, on the client's own device:
- [ ] the played cards leave the client's fan immediately
- [ ] the same cards cannot be replayed (they are gone, not greyed)
- [ ] the board shows **resolved species**, never a 🎭 Mimic

- [ ] **Step 4: Exercise a client Mimic play**

Have a **client** play a Mimic-padded Challenge or Swarm. Then read the Trail. Confirm:
- [ ] the Trail names the claimed species and the Mimic count ("… (1 Mimic)")
- [ ] the Mimic is gone from that client's Hoard
- [ ] the Hoard count in the player strip dropped by the right amount on **every** device

> This is the single highest-risk interaction in the build. If the Mimic stays in the client's fan, `pkoRemoveFromHoard` is being handed the resolved array instead of the raw one.

- [ ] **Step 5: Exercise each mutating event on a client**

Play until each fires (or restart Clashes to force draws). After **each**, confirm on a **client** device — not the host — that its own fan matches its count in the player strip:
- [ ] **The Culling** — a species disappeared from the client's fan
- [ ] **Migration** — the client's whole hand is a different hand
- [ ] **Extinction Event** — a species is gone everywhere; if it empties two Hoards, both score and the Clash result names both

- [ ] **Step 6: Exercise Carrion from a client**

A **client** must be the Challenger when Carrion fires. Confirm:
- [ ] the overlay opens on the client's device (this is spec gap C5 — if it opens only for the host, `PKO_CARRION_OPEN` is not being sent or not being handled)
- [ ] other devices show the waiting line, not the overlay
- [ ] tapping two cards then letting the clock expire keeps exactly those two
- [ ] the kept cards appear in that client's own fan

- [ ] **Step 7: Exercise Alpha and the track locks**

- [ ] **Alpha** — the crown renders on one Mark; the board grows rather than being replaced; Swarming the Alpha grows it by 2
- [ ] **The Deluge / The Dry Season** — a player holding nothing of the locked track sees the button **disabled with the reason written on it**, and Retreat still works
- [ ] **The Great Reversal** — open the chain overlay mid-Encounter and confirm the header says the Reversal is live and the "Beaten by" rows have inverted

- [ ] **Step 8: Record the outcome**

Log every bug found in `docs/implementation-notes/pko-implementation-notes.md` as **What happened → Root cause → Lesson**, in the same session as the fix. Then dial `PKO_CARRION_WINDOW_MS` if 5 s read wrong at the table (D31 flags it as the first playtest dial) and record the new value with the reason.

Only then write `docs/phase38-snapshot.md`.

---

## Self-Review

Run against the spec after the plan is complete; findings folded in above.

**Spec coverage** — §1 identity (Task 4), §2 state flow (4, 7, 8, 9), §3 screen registry (4), §4 state variables + timer lifecycle (4, 9), §5 settings copy (10), §6 scoring (3), §7.1 Mimic (7), §7.2 Reversal (5), §7.3 track lock (5), §7.4 Alpha (8), §7.5 Carrion (9), §7.6 Culling ties (6), §8 registry + mutating events (4, 6), §9 Invasive Mimicry (7), §10 data (1), §11 multiplayer (2, 3, 4, 9), §12 overlays (9, 10), §13 audio (4), §14 art + PWA (1 — art already shipped, C2), §15 verification (4–9), §16 order (Tasks 1–12 map to steps 1–10 with step 2 split into Tasks 2 and 3), §17 decisions (11), §18 deviations (11), §19 doc closure (11). **No gaps.**

**Type consistency** — `pkoResolveGroup` returns `{ok:false}` or `{ok, claim, resolved}` and is consumed with that exact shape in Tasks 5, 7 and 8. `onFire()` returns `int[]` in Task 4's contract and in all three implementations in Task 6. `pkoResolveClash` takes `int[]` from Task 3 onward, and Task 6's Extinction is its only new caller. `pkoAfterBoardChange(playerIdx, spoils)` gains its second parameter in Task 9; Tasks 3 and 8 call it with one argument, which is `undefined` and correct. `pkoDiscardBoard(exceptIdx)` defaults to `-1` in Task 8; every pre-existing zero-argument call keeps working.

**Ordering** — Task 4 references `pkoFireCulling`/`pkoFireExtinction`/`pkoFireMigration` before Task 6 defines them, inside arrow functions the Task 4 harness never invokes. Stated explicitly at Task 4 Step 9, with a warning not to stub them.
