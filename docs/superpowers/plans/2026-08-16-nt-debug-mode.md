# Net-Trace Debug / Sandbox Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Debug / Sandbox Mode to Net-Trace where one person authors the relay-leg node by hand, then every player hardens it with unlimited retries before the normal Diagnostic Summary scores each player's best attempt.

**Architecture:** The authored node is *shape-identical* to what `ntGenerateNode()` already returns (`{ n, ingress, egress, badSectors[], nativeHoneypots[] }` plus `ntInventory`), so the feature replaces one function call with a human and leaves path validity, timeline simulation, playback and SER scoring untouched. A new `screen-nt-authoring` runs a thin brush-based grid controller that writes **directly into `ntNode`** with `ntMyPlacements` empty — which makes it WYSIWYG for free through the existing, unmodified `ntBlockAt` / `ntPaintCell` / `ntCellType` primitives. `ntRenderBuildGrid` is left byte-identical apart from one closure extraction. Only two new packets; `NT_GENERATE`, `NT_PLAYBACK` and `ntResolveCycleMdlm` are reused verbatim.

**Tech Stack:** Vanilla JS (ES6+, all globals, no modules), HTML5, CSS3, Tailwind from the local `/js/lib/tailwind-play.js`. No npm, no build step. Firebase RTDB for multiplayer. Verification via `node tools/verify-nt-loopback.js`.

**Spec:** `docs/superpowers/specs/2026-08-16-nt-debug-mode-design.md`

---

## ⚠ Three corrections to the spec, applied throughout this plan

These were found while checking the plan against the shipped source. Each is a deliberate,
reasoned deviation — **follow the plan, not the spec, where they disagree.**

### C1 — "Best" is the **HIGHEST** latency, not the lowest

Spec § 3 defines Best Trace as "a player's **lowest**-latency attempt" and § 8.1 shows an
improvement as `NEW BEST −1,240 ms`. **This is backwards for Net-Trace.** The player is the
*defender*, slowing an intruder's signal down; the How to Play overlay states the scoring rule
outright (`index.html:7690`):

> *"**Longest delay** each cycle scores 100.00%; everyone else is scored relative to it."*

`ntResolveCyclePtp` (`nt.js:314`) and `ntResolveCycleMdlm` (`nt.js:3095`) both compute
`sers = latencies.map(lat => (lat / maxLat) * 100)` — a **higher** latency is a **better** SER.
Shipping the spec's version would make every "NEW BEST" banner celebrate the player's worst
build, and the summary would score their weakest attempt.

**Therefore, everywhere in this plan:** best = `latency > previousBest`; an improvement is a
**positive** delta and renders as `NEW BEST +1,240 ms`.

### C2 — `ntDebugMode` must be added to the settings-sync payload, both directions

The spec's § 6.4 wiring list omits this. `ntDebugMode` is a **setting**, and settings reach
clients only through `SETTINGS_SYNC`. Two edits in `js/engine-multiplayer.js` (Task 2, Step 3):
the `case 'nt': return { … }` collector at line 857 and the `case 'nt':` applier at line 1031.
Without both, a client never learns the session is in Debug — its `ntEffectiveHardeningWin()`
returns a real timer, its build screen shows the wrong header, and `ntCommit()` takes the
Standard path instead of the sandbox one.

### C3 — `NT_DEBUG_ROSTER` gains an `authoring: true` flag; still two new packets

Spec § 4 requires that when the host taps `Author New Node`, every other device returns to the
standby it saw at the start. That needs a signal, and the spec's packet table has no room for it.
Rather than mint a third packet, `NT_DEBUG_ROSTER` carries an optional `authoring: true`. The
packet count in spec § 9 is unchanged; one packet gains one field. Handled in Task 9.

---

## Global Constraints

Copied from `CLAUDE.md` and the three always-loaded rule files. **Every task's requirements
implicitly include this section.**

- **No build tools.** No `npm`, no webpack, no ES modules, no external JS libraries. All symbols are globals; forward references work at runtime.
- **Never full-read `index.html`** (~515 KB). Grep for the id, then `Read` with `offset`/`limit`. Same rule for any file over ~40 KB — `js/games/nt.js` is 3,703 lines.
- **`index.html` encoding:** use the `Edit` tool only for the *localised, single-site* insertions this plan specifies. Never use `Edit` for a systematic multi-site sweep of `index.html` — that has previously produced UTF-8 mojibake. Every insertion below names one anchor line.
- **Australian English, metric units.** colour, organise, recognise, analyse. In UI copy and comments alike.
- **Every new screen id must be added to `allScreens[]`** in `js/engine.js` (line ~71). A screen missing from it is a ghost screen that never hides.
- **Every new overlay id must be added to the NT teardown list** in `resetToLobby()`, `js/engine.js:698`.
- **Pill buttons never lose the base `.pill` class.** Only add/remove `pill-active-emerald`.
- **Action buttons carry no emoji** and take one of three colours: the game's brand (emerald), neutral stone, or semantic destructive red.
- **Decision Modal buttons** are `min-h-14 w-full rounded-2xl … font-semibold text-lg active:scale-95 transition-all duration-150`. `min-h-11 / text-sm` is not a valid Decision Modal button.
- **New screens use THE STACK** (`ui-style.md`): `flex items-center justify-center w-full min-h-screen px-4 py-8 overflow-y-auto` on the `<section>`, with Header + Stage + Controls as **siblings** in one `flex flex-col w-full max-w-sm gap-N` inner div. Never `h-screen`/`flex-1`/`my-auto`. `screen-nt-authoring` must **not** be added to the legacy sticky-footer whitelist.
- **NT brand colour is emerald** — `bg-emerald-500 hover:bg-emerald-600`, `pill-active-emerald`, `game-toggle-on-emerald`, `border-emerald-300`, `text-emerald-600`.
- **Firebase erases every empty value.** `[]`, `{}` and `null` are *deleted* in flight and read back as `undefined`. `false`, `0` and `''` are safe. Every collection read from a payload uses `payload.x || []`.
- **`[].every(Boolean)` is `true`.** Any per-seat readiness array is sized `new Array(ntPlayerCount).fill(false)` and never left as `[]`.
- **The host never sends itself an ACTION.** `engine-multiplayer.js` drops every envelope where `originId === syllyDeviceUid`. A host that is also a submitting participant mutates its own state directly, then broadcasts.
- **`tools/verify-nt-loopback.js` must stay green** — 146 existing checks, unchanged, across several `NT_SEED=` values.
- **Verification commands** (run from the repo root):
  - `node --check js/games/nt.js` — syntax
  - `node tools/verify-nt-loopback.js` — the harness
  - `NT_SEED=1 node tools/verify-nt-loopback.js` (and 2, 3, …) — seed sweep
  - `NT_SRC=/path/to/reverted-nt.js node tools/verify-nt-loopback.js` — prove a new check fails before the fix makes it pass

### Harness facts an implementer needs

`tools/verify-nt-loopback.js` runs `js/games/nt.js` inside a `vm` sandbox with a **real** mock
DOM (`getElementById` auto-vivifies, `classList` is real, `innerHTML` parses ids and classes).
Three consequences that shape every test in this plan:

- `document.querySelectorAll` at the **document** level returns `[]` (element-level
  `querySelectorAll` works). So `ntSyncSettingsUI()` and `ntSyncAuthUI()` run without throwing,
  but their `document.querySelectorAll('[data-…]')` loops are no-ops. Assert via `getElementById`
  readers, never via pill classes.
- `setInterval` is a deliberate no-op; `requestAnimationFrame` returns a fake handle. A test that
  wants the timer-expiry path calls `ntCommit()` directly.
- The bridge object `globalThis.__nt` at the bottom of `makeDevice()` is the only way in. Every
  task that needs a new hook adds it there.

---

## File Structure

| File | Responsibility for this feature |
|------|--------------------------------|
| `js/games/nt.js` | All Debug state, the Node Editor controller, the retry loop, the two new packet handlers. ~330 new lines, in three clearly-headed blocks. |
| `index.html` | `screen-nt-authoring`, `nt-debug-retry-overlay`, the Debug settings card + reason lines, three small edits to existing NT markup. |
| `js/engine.js` | Two lines: `allScreens[]` and the `resetToLobby()` teardown list. |
| `js/engine-multiplayer.js` | Two lines: `ntDebugMode` in the settings collector and applier (correction C2). |
| `tools/verify-nt-loopback.js` | A new Debug scenario (§ 11.1's seven checks) + bridge hooks. |
| `sw.js` | `CACHE_NAME` bump. |
| `docs/**` | The § 13 documentation pass. |

No new files are created. NT's plugin file is large but this is a cohesive feature belonging to
it; splitting it out would break the suite's one-file-per-game convention for no benefit.

---

## Task 1: Fix the pre-existing `game-identities.md` drift

`CLAUDE.md`'s Enforcement clause requires doc/code discrepancies to be **resolved before
implementation begins**. This one matters directly: Debug *supersedes* the cycles setting, and an
implementer working from the doc would hunt for a variable that does not exist.

**Files:**
- Modify: `docs/rules/game-identities.md` — § Game 13: Net-Trace, the Settings table and the Overlay Types table

**Interfaces:**
- Consumes: nothing
- Produces: nothing (documentation only)

- [ ] **Step 1: Locate the section**

```bash
grep -n "## Game 13" docs/rules/game-identities.md
grep -n "ntCycles\|ntComponentDensity\|nt-quit-overlay" docs/rules/game-identities.md
```

Read only that slice with `offset`/`limit`. **Do not read the file whole — it is 135 KB.**

- [ ] **Step 2: Confirm the drift against the shipped code**

```bash
grep -c "ntComponentDensity" js/games/nt.js index.html   # expect 0 and 0
grep -n "let ntIterations\|let ntMatrixScale\|let ntNativeHoneypots\|let ntHardeningWin" js/games/nt.js
grep -n "data-nt-scale\|data-nt-iters\|data-nt-win\|data-nt-native" index.html | head
```

Expected: `ntComponentDensity` appears **nowhere**; `nt.js:86–89` declares `ntMatrixScale = 18`,
`ntIterations = 5`, `ntHardeningWin = 90`, `ntNativeHoneypots = 2`.

- [ ] **Step 3: Rewrite the Settings table**

Replace the existing rows so the table reads exactly:

| Setting | Variable | Options | Default |
|---------|----------|---------|---------|
| Matrix Scale | `ntMatrixScale` | 16 / 18 / 20 | 18 |
| Simulation Iterations | `ntIterations` | 5 / 7 / 10 | 5 |
| Hardening Window | `ntHardeningWin` | 45s / 60s / 90s / No Limit (`0`) | 90 |
| Native Honeypots | `ntNativeHoneypots` | 0 / 1 / 2 | 2 |
| ✨ Sylly Mode | `ntSyllyMode` | ON / OFF | OFF |

Delete the `ntCycles` row and the `ntComponentDensity` row outright — neither describes anything
that exists.

- [ ] **Step 4: Add the two missing overlays**

Add `nt-reboot-overlay` and `nt-logs-overlay` to the § Game 13 Overlay Types table. Both are
already in `js/engine.js:698`'s teardown list; the doc simply never listed them.

- [ ] **Step 5: Commit**

```bash
git add docs/rules/game-identities.md
git commit -m "docs(nt): correct the Game 13 settings table to match shipped code

The table listed ntCycles (3/5, default 3) and ntComponentDensity, neither of
which exists — ntComponentDensity has zero occurrences in the codebase. The real
settings are ntMatrixScale, ntIterations, ntHardeningWin and ntNativeHoneypots.
Also adds nt-reboot-overlay and nt-logs-overlay to the overlay table; both were
already in engine.js's teardown list.

Found while planning Debug Mode, which supersedes the cycles setting — so an
implementer reading the doc would have gone looking for a variable that is not
there. CLAUDE.md's Enforcement clause requires this fixed before implementation.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Debug Mode state, the settings card, and `ntEffectiveHardeningWin()`

This task also silently fixes spec § 10 hazard 1: `ntStartBuildTimer` early-returns on a zero
window **before** it arms `ntResolveGuard` (`nt.js:2338` vs `2356`), so routing that check through
the accessor means the guard is never armed in Debug. No separate fix is needed.

**Files:**
- Modify: `js/games/nt.js` — state block ~line 86–90 and ~146; new helper after `ntIsDNP()` (line 182); `ntSyncSettingsUI` (3437); DOMContentLoaded settings wiring (3507–3525); four `ntHardeningWin` read sites (1295, 1330, 2338, 2344)
- Modify: `index.html` — new settings card before line 7632; reason-line + control-wrapper edits to the cards at 7595–7605 and 7607–7618
- Modify: `js/engine-multiplayer.js:857` and `:1031` (correction C2)
- Test: `tools/verify-nt-loopback.js` — new bridge hooks + a settings section

**Interfaces:**
- Consumes: nothing
- Produces:
  - `ntDebugMode: boolean` — the setting; survives `ntResetState()`
  - `ntDebugBrush: string` — `'bad' | 'native' | 'ingress' | 'egress'`
  - `ntDebugMyAttempt: number` — MY attempt count on the current node
  - `ntDebugBest: { latencyMs: number, placements: Array, timeline: object } | null`
  - `ntDebugFinished: boolean[]` — host authority, the readiness gate
  - `ntDebugAttemptCounts: number[]` — display only
  - `ntEffectiveHardeningWin(): number` — `0` in Debug, `ntHardeningWin` otherwise
  - `ntSetCardDisabled(ctlId, reasonId, disabled, reason): void`

> **Naming trap — do not "tidy" these.** `ntDebugMyAttempt` (my scalar) and
> `ntDebugAttemptCounts` (everyone's array) are deliberately *not* singular/plural of the same
> word. An earlier draft used `ntDebugAttempt` / `ntDebugAttempts`, one letter apart with
> different meanings *and* different scopes.

- [ ] **Step 1: Write the failing test**

Add to `tools/verify-nt-loopback.js`. First extend the bridge (inside the `BRIDGE` template
string in `makeDevice`, alongside the other getters):

```js
  get debugMode()     { return ntDebugMode; },
  get debugBrush()    { return ntDebugBrush; },
  get debugAttempt()  { return ntDebugMyAttempt; },
  get debugBest()     { return ntDebugBest ? ntDebugBest.latencyMs : null; },
  get debugFinished() { return ntDebugFinished; },
  get debugCounts()   { return ntDebugAttemptCounts; },
  get rawWin()        { return ntHardeningWin; },     // the STORED value, never the effective one
  setDebug(v)         { ntDebugMode = !!v; },
  effWin()            { return ntEffectiveHardeningWin(); },
  syncSettings()      { ntSyncSettingsUI(); },
  text(id)            { return document.getElementById(id).textContent; },
  shown(id)           { return document.getElementById(id).style.display !== 'none'; },
  cls(id)             { return document.getElementById(id).className; },
```

Then extend `__nt.seat()` (also inside `BRIDGE`) with one line, placed immediately after the
`ntSyllyMode` assignment:

```js
    ntDebugMode       = !!o.debug;
```

Now append this scenario at the end of the file, **before** the final failure-count report:

```js
// ── Debug Mode: the setting, its exclusivity, and the superseded window ───────
section('Debug Mode — settings');
(() => {
  const d = makeDevice('solo', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);

  d.__nt.seat({ players: 1, names: ['Ali'], win: 90, debug: false });
  check('effective window is the real one when Debug is off', d.__nt.effWin(), 90);

  d.__nt.seat({ players: 1, names: ['Ali'], win: 90, debug: true });
  check('effective window is 0 (∞) when Debug is on',         d.__nt.effWin(), 0);
  // Superseded, NOT overwritten — the player's stored choice must come back intact when
  // Debug is switched off again, which is the whole distinction from "mutually exclusive".
  check('…while the STORED setting is left untouched',        d.__nt.rawWin(), 90);

  // Superseded + mutually-exclusive dimming, painted by ntSyncSettingsUI().
  d.__nt.syncSettings();
  check('Hardening Window controls are dimmed',
        /opacity-50/.test(d.__nt.cls('nt-ctl-win')), true);
  check('…with an amber reason line, not a silent dead control',
        d.__nt.text('nt-reason-win'), 'Debug Mode has no time limit');
  check('Iterations controls are dimmed too',
        /pointer-events-none/.test(d.__nt.cls('nt-ctl-iters')), true);
  check('Sylly toggle is dimmed while Debug is on',
        d.__nt.text('nt-reason-sylly'), 'Unavailable while Debug Mode is on');

  d.__nt.seat({ players: 1, names: ['Ali'], win: 90, debug: false });
  d.__nt.syncSettings();
  check('turning Debug off restores the Hardening Window controls',
        /opacity-50/.test(d.__nt.cls('nt-ctl-win')), false);
  check('…and clears its reason line', d.__nt.text('nt-reason-win'), '');
  check('no exceptions', errs(d), []);
})();
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
node tools/verify-nt-loopback.js
```

Expected: FAIL — `ntEffectiveHardeningWin is not defined` surfaces as a thrown error, and the
reason-line checks report `expected "Debug Mode has no time limit", got ""`.

- [ ] **Step 3: Add the state variables**

In `js/games/nt.js`, at line 90, insert the setting **directly above** `ntSyllyMode` so the
declaration order matches the settings-card order:

```js
let ntNativeHoneypots= 2;        // 0 | 1 | 2   — max Native Honeypots baked into seed
let ntDebugMode      = false;    // Debug / Sandbox Mode — mutually exclusive with ntSyllyMode
let ntSyllyMode      = false;    // DNP (Distributed Network Protocol) — always last setting
```

Then, immediately after the readyCheck block (after `let ntSummaryReadyCheck = [];`, line 146),
add the five session-scoped variables:

```js
// ── Debug / Sandbox Mode session state (all cleared by ntResetState; ntDebugMode is a
//    SETTING and deliberately survives, like every other setting) ──────────────────────
let ntDebugBrush         = 'bad'; // Node Editor: 'bad' | 'native' | 'ingress' | 'egress'
let ntDebugMyAttempt     = 0;     // MY attempt number on the current node (1-based when shown)
let ntDebugBest          = null;  // MY best so far — { latencyMs, placements, timeline } | null
let ntDebugFinished      = [];    // [playerIdx] = bool — host authority, the readiness gate
let ntDebugAttemptCounts = [];    // [playerIdx] = int  — display only, drives the roster
```

- [ ] **Step 4: Add the accessor and route the four read sites through it**

In `js/games/nt.js`, directly after `ntIsDNP()` (line 182):

```js
// Debug Mode forces the Hardening Window to ∞. `0` already means "no limit" everywhere in NT
// (ntStartBuildTimer early-returns and renders ∞), so this is a new way of reaching shipped
// code rather than new behaviour. Single-source, per logic-engine.md: a mode that mutates a
// value routes every reader through one function instead of repeating the branch at four call
// sites where the fifth one added later would be missed.
function ntEffectiveHardeningWin() { return ntDebugMode ? 0 : ntHardeningWin; }
```

Replace at exactly these four sites — **`ntHardeningWin` → `ntEffectiveHardeningWin()`**:

| Line | Before | After |
|------|--------|-------|
| 1295 | `const endTimestamp = ntHardeningWin > 0 ? Date.now() + (ntHardeningWin * 1000) : null;` *(in `ntCheckBothTeamsLocked`)* | `const endTimestamp = ntEffectiveHardeningWin() > 0 ? Date.now() + (ntEffectiveHardeningWin() * 1000) : null;` |
| 1330 | `const endTimestamp = ntHardeningWin > 0 ? Date.now() + (ntHardeningWin * 1000) : null;` *(in `ntShowMdlmGate`)* | same substitution |
| 2338 | `if (ntHardeningWin === 0) {` | `if (ntEffectiveHardeningWin() === 0) {` |
| 2344 | `: ntHardeningWin;` | `: ntEffectiveHardeningWin();` |

> **Note on line 1295:** it sits in `ntCheckBothTeamsLocked`, which is DNP-only and therefore
> unreachable in Debug (the two modes disable each other). Routing it anyway is free — with
> `ntDebugMode === false` the accessor returns `ntHardeningWin` identically — and it removes the
> "which of these five is the reachable one?" question from every future reader. **Do not** touch
> the other five sites: `658`, `667` and `3263` are DNP-only huddle-duration maths, and `3440` /
> `3514` are the settings UI, which must keep reading the raw stored value so the player's choice
> is still displayed and survives Debug being switched off.

- [ ] **Step 5: Add the dimming helper and extend `ntSyncSettingsUI`**

In `js/games/nt.js`, directly above `ntSyncSettingsUI` (line 3437):

```js
// Mutually-exclusive / superseded settings (ui-style.md § Settings Layout Standard).
// The controls dim; the card TITLE stays at full contrast — a fully-dimmed card reads as a
// rendering bug rather than an unavailable option. The amber reason line is mandatory: a dead
// control with no explanation is indistinguishable from a bug, and the player has no way to
// discover that a different setting is the cause. Amber, never text-stone-400 — stone-400 is
// already the dynamic-value-line colour (what you have PICKED); amber means UNAVAILABLE.
function ntSetCardDisabled(ctlId, reasonId, disabled, reason) {
  const ctl = document.getElementById(ctlId);
  if (ctl) {
    ctl.classList.toggle('opacity-50', disabled);
    ctl.classList.toggle('pointer-events-none', disabled);
  }
  const r = document.getElementById(reasonId);
  if (r) {
    r.textContent   = disabled ? reason : '';
    r.style.display = disabled ? '' : 'none';
  }
}
```

Then replace `ntSyncSettingsUI` entirely with:

```js
function ntSyncSettingsUI() {
  ntSelectPill('nt-scale', ntMatrixScale);
  ntSelectPill('nt-iters', ntIterations);
  ntSelectPill('nt-win', ntHardeningWin);
  ntSelectPill('nt-native', ntNativeHoneypots);
  const t = document.getElementById('btn-nt-sylly-toggle');
  if (t) {
    t.textContent = ntSyllyMode ? 'ON' : 'OFF';
    t.className = (ntSyllyMode ? 'game-toggle-on-emerald' : 'game-toggle-off') + ' shrink-0';
  }
  const d = document.getElementById('btn-nt-debug-toggle');
  if (d) {
    d.textContent = ntDebugMode ? 'ON' : 'OFF';
    d.className = (ntDebugMode ? 'game-toggle-on-emerald' : 'game-toggle-off') + ' shrink-0';
  }
  // Mutually exclusive — each turns the other off, and dims it while on. Both stay reachable.
  ntSetCardDisabled('btn-nt-sylly-toggle', 'nt-reason-sylly', ntDebugMode, 'Unavailable while Debug Mode is on');
  ntSetCardDisabled('btn-nt-debug-toggle', 'nt-reason-debug', ntSyllyMode, 'Unavailable while Sylly Mode is on');
  // Superseded — the stored values are NOT modified and return intact when Debug goes off.
  ntSetCardDisabled('nt-ctl-iters', 'nt-reason-iters', ntDebugMode, 'Debug Mode runs a single Node');
  ntSetCardDisabled('nt-ctl-win',   'nt-reason-win',   ntDebugMode, 'Debug Mode has no time limit');
}
```

- [ ] **Step 6: Wire the toggles**

In `js/games/nt.js`, replace the Sylly toggle listener (lines 3521–3525) with both handlers:

```js
  // Sylly Mode (DNP) toggle — reciprocally forces Debug off (mutually exclusive)
  document.getElementById('btn-nt-sylly-toggle').addEventListener('click', () => {
    ntSyllyMode = !ntSyllyMode;
    if (ntSyllyMode) { ntDebugMode = false; playSyllyOn(); } else playSyllyOff();
    ntSyncSettingsUI();
  });

  // Debug Mode toggle — forces Sylly off. Uses playPillClick, not playSyllyOn/Off: those two
  // are the Sylly Mode signature across the whole suite and Debug is an ordinary setting.
  document.getElementById('btn-nt-debug-toggle').addEventListener('click', () => {
    ntDebugMode = !ntDebugMode;
    if (ntDebugMode) ntSyllyMode = false;
    playPillClick();
    ntSyncSettingsUI();
  });
```

- [ ] **Step 7: Add the settings markup**

In `index.html`, wrap the **Simulation Iterations** pill row (currently lines 7600–7604) so it can
be dimmed, and give it a reason line. Replace lines 7595–7605 with:

```html
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
          <div>
            <p class="text-stone-800 font-semibold">Simulation Iterations</p>
            <p class="text-stone-400 text-sm mt-0.5">How many Vulnerability Simulations make up a full match.</p>
          </div>
          <div id="nt-ctl-iters" class="flex gap-2">
            <button class="pill pill-active-emerald" data-nt-iters="5">5</button>
            <button class="pill" data-nt-iters="7">7</button>
            <button class="pill" data-nt-iters="10">10</button>
          </div>
          <p id="nt-reason-iters" style="display:none" class="text-amber-600 text-xs"></p>
        </div>
```

Then the same for **Hardening Window** — replace lines 7607–7618 with:

```html
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
          <div>
            <p class="text-stone-800 font-semibold">Hardening Window</p>
            <p class="text-stone-400 text-sm mt-0.5">How long you get to build each Node before the layout locks.</p>
          </div>
          <div id="nt-ctl-win" class="flex gap-2">
            <button class="pill" data-nt-win="45">45s</button>
            <button class="pill" data-nt-win="60">60s</button>
            <button class="pill pill-active-emerald" data-nt-win="90">90s</button>
            <button class="pill" data-nt-win="0">No Limit</button>
          </div>
          <p id="nt-reason-win" style="display:none" class="text-amber-600 text-xs"></p>
        </div>
```

Now insert the **Debug Mode card** immediately before the `✨ Sylly Mode` card (before the
existing line 7632). Debug sits second-to-last, directly above Sylly — a sanctioned exception to
"Sylly Mode is always the last card", granted only to an exclusivity partner:

```html
        <!-- Debug Mode — the ONE card permitted to sit below the others and above ✨ Sylly Mode.
             It is Sylly's exclusivity partner; nothing else may take this slot. -->
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <p class="text-stone-800 font-semibold">Debug Mode</p>
            <button id="btn-nt-debug-toggle" class="game-toggle-off shrink-0">OFF</button>
          </div>
          <p class="text-stone-600 text-sm font-semibold">Staging Environment</p>
          <p class="text-stone-400 text-sm">Build the Node yourself instead of letting the system roll one — draw the terrain, drop the Honeypots, place the ports and set the budget. Everyone then hardens it and can re-run the trace as many times as they like.</p>
          <p id="nt-reason-debug" style="display:none" class="text-amber-600 text-xs"></p>
        </div>
```

Finally add a reason line to the Sylly card. Insert as the last child of the existing Sylly card
(after the `<p class="text-stone-400 text-sm">Form two corporate clusters…</p>` at line 7638):

```html
          <p id="nt-reason-sylly" style="display:none" class="text-amber-600 text-xs"></p>
```

- [ ] **Step 8: Sync `ntDebugMode` to clients (correction C2)**

In `js/engine-multiplayer.js`, line 857, add the field to the collector:

```js
    case 'nt': return {
      ntMatrixScale, ntIterations, ntHardeningWin, ntNativeHoneypots, ntDebugMode, ntSyllyMode,
    };
```

And at line 1031, add the matching applier line:

```js
        case 'nt':
          if (s.ntMatrixScale      !== undefined) ntMatrixScale      = s.ntMatrixScale;
          if (s.ntIterations       !== undefined) ntIterations       = s.ntIterations;
          if (s.ntHardeningWin     !== undefined) ntHardeningWin     = s.ntHardeningWin;
          if (s.ntNativeHoneypots  !== undefined) ntNativeHoneypots  = s.ntNativeHoneypots;
          if (s.ntDebugMode        !== undefined) ntDebugMode        = s.ntDebugMode;
          if (s.ntSyllyMode        !== undefined) ntSyllyMode        = s.ntSyllyMode;
          break;
```

`false` is a legitimate stored value on the wire and is never erased, so no `|| false` is needed.

> **Two things in `MP_GAME_CONFIGS` deliberately need NO change — do not "fix" them.**
> `getLockedModes()` locks PTP when DNP is on; Debug forces DNP off and supports all three
> modes, so it locks nothing and is already correct. `rosterConfig.type` is a function returning
> `'teams'` when DNP is on and `'none'` otherwise; Debug ⇒ DNP off ⇒ `'none'`, which is what
> automatic seating wants.

- [ ] **Step 9: Run the tests to verify they pass**

```bash
node --check js/games/nt.js && node --check js/engine-multiplayer.js
node tools/verify-nt-loopback.js
```

Expected: PASS on all new checks, and the 146 existing checks still green.

- [ ] **Step 10: Sweep seeds**

```bash
for s in 1 2 3 4 5 6 7 8; do NT_SEED=$s node tools/verify-nt-loopback.js | tail -3; done
```

Expected: zero failures on every seed.

- [ ] **Step 11: Commit**

```bash
git add js/games/nt.js js/engine-multiplayer.js index.html tools/verify-nt-loopback.js
git commit -m "feat(nt): Debug Mode setting, exclusivity pattern, and the ∞ hardening window

Adds ntDebugMode plus the five session-scoped Debug variables, and the new
mutually-exclusive / superseded settings pattern: Debug and Sylly turn each
other off, and Debug supersedes Iterations and Hardening Window without
touching their stored values. Dimmed controls always carry an amber reason
line — a dead control with no explanation is indistinguishable from a bug.

ntEffectiveHardeningWin() routes the four Debug-reachable read sites through
one accessor. 0 already means 'no limit' throughout NT, so this reaches shipped
code rather than adding behaviour — and because ntStartBuildTimer early-returns
on a zero window BEFORE arming ntResolveGuard, it also means the host's
force-resolve fallback is never armed in Debug (spec hazard 1) for free.

ntDebugMode is added to SETTINGS_SYNC in both directions; without it a client
never learns the session is in Debug.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Extract `ntDrawPortMarker` from `ntRenderBuildGrid`

`portBar` is currently a closure inside `ntRenderBuildGrid` (`nt.js:2191`). The Node Editor needs
the same markers, and two copies would drift. This is the **only** change to `ntRenderBuildGrid` —
everything else about it stays byte-identical, which is what keeps the existing 146 checks
meaningful as a regression guard.

**Files:**
- Modify: `js/games/nt.js` — remove lines 2188–2208, add a module-scope function above `ntRenderBuildGrid` (line 2068)
- Test: `tools/verify-nt-loopback.js`

**Interfaces:**
- Consumes: `ntDrawPortMarker` is used by Task 5's `ntRenderAuthGrid`
- Produces: `ntDrawPortMarker(grid, port, color, inward, n): HTMLElement` — appends a port marker to `grid` and returns it

- [ ] **Step 1: Write the failing test**

Add a bridge reader (inside `BRIDGE`, next to `gridCells()`):

```js
  gridPorts()      { return document.getElementById('nt-build-grid').children
                       .filter(c => /(^| )absolute( |$)/.test(c.className || '')).length; },
  authPorts()      { return document.getElementById('nt-auth-grid').children
                       .filter(c => /(^| )absolute( |$)/.test(c.className || '')).length; },
  // The existing gridCells() is hardcoded to nt-build-grid — the editor needs its own.
  authCells()      { return document.getElementById('nt-auth-grid').children
                       .filter(c => /(^| )nt-cell( |$)/.test(c.className || '')).length; },
```

And append this scenario near the end of the file:

```js
// ── The shared port marker ────────────────────────────────────────────────────
section('Port markers — one drawing function, two grids');
(() => {
  const d = makeDevice('ports', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'] });
  d.__nt.genNode();
  d.__nt.renderGrid();
  check('build grid draws exactly two port markers', d.__nt.gridPorts(), 2);

  // The extracted function must be callable against ANY grid element, not just the build one.
  const n = d.__nt.node.n;
  d.__nt.drawPort('nt-auth-grid', d.__nt.node.ingress, '#34d399', true, n);
  d.__nt.drawPort('nt-auth-grid', d.__nt.node.egress, '#334155', false, n);
  check('…and the same function serves a second grid', d.__nt.authPorts(), 2);
  check('no exceptions', errs(d), []);
})();
```

Add the driving hook to `BRIDGE` too:

```js
  drawPort(gridId, port, col, inward, n) {
    return ntDrawPortMarker(document.getElementById(gridId), port, col, inward, n);
  },
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node tools/verify-nt-loopback.js
```

Expected: FAIL — `ntDrawPortMarker is not defined`.

- [ ] **Step 3: Add the module-scope function**

In `js/games/nt.js`, immediately **above** `function ntRenderBuildGrid()` (line 2068):

```js
// Port markers — a rectangle straddling the grid border; ingress green/inward, egress
// grey/outward. Lifted out of ntRenderBuildGrid so the build grid and the Node Editor call
// the same code and can never drift into drawing different markers.
const NT_PORT_ARROWS = { top:  { in: '▼', out: '▲' }, bottom: { in: '▲', out: '▼' },
                         left: { in: '▶', out: '◀' }, right:  { in: '◀', out: '▶' } };

function ntDrawPortMarker(grid, port, color, inward, n) {
  if (!grid || !port) return null;
  const m = document.createElement('div');
  m.className = 'absolute pointer-events-none rounded-sm flex items-center justify-center';
  m.style.background = color;
  m.style.boxShadow = `0 0 6px ${color}`;
  const span = `calc(${100 / n}%)`, off = '-3px', thick = '6px';
  if (port.edge === 'top')         { m.style.left = `${(port.idx / n) * 100}%`; m.style.width = span; m.style.top = off; m.style.height = thick; }
  else if (port.edge === 'bottom') { m.style.left = `${(port.idx / n) * 100}%`; m.style.width = span; m.style.bottom = off; m.style.height = thick; }
  else if (port.edge === 'left')   { m.style.top = `${(port.idx / n) * 100}%`; m.style.height = span; m.style.left = off; m.style.width = thick; }
  else                             { m.style.top = `${(port.idx / n) * 100}%`; m.style.height = span; m.style.right = off; m.style.width = thick; }
  const a = document.createElement('span');
  a.style.cssText = 'font-size:5px;line-height:1;color:#fff;pointer-events:none';
  a.textContent = NT_PORT_ARROWS[port.edge][inward ? 'in' : 'out'];
  m.appendChild(a);
  grid.appendChild(m);
  return m;
}
```

- [ ] **Step 4: Replace the closure with two calls**

In `ntRenderBuildGrid`, delete lines 2188–2208 (the `ARROWS` constant, the whole `portBar` arrow
function, and the two `portBar(...)` calls) and put in their place:

```js
  ntDrawPortMarker(grid, ntNode.ingress, '#34d399', true, n);            // INGRESS — green, inward
  ntDrawPortMarker(grid, ntNode.egress,  NT_COLOR_BAD_SECTOR, false, n); // EGRESS  — grey, outward
```

`ntUpdateBuildCounters();` stays as the function's last line, unchanged.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
node --check js/games/nt.js && node tools/verify-nt-loopback.js
```

Expected: PASS, including all 146 pre-existing checks — the build grid must be behaviourally
identical.

- [ ] **Step 6: Commit**

```bash
git add js/games/nt.js tools/verify-nt-loopback.js
git commit -m "refactor(nt): lift the port-marker drawing out of ntRenderBuildGrid

portBar was a closure inside ntRenderBuildGrid. The Node Editor needs the same
markers, and two copies would drift, so it becomes module-scope
ntDrawPortMarker(grid, port, color, inward, n). Behaviour is unchanged — this
is the only edit ntRenderBuildGrid receives in the whole Debug Mode feature,
which is what keeps the existing 146 checks meaningful as a regression guard.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: The `screen-nt-authoring` markup and engine registration

Markup and registration only — no controller yet, so nothing can reach this screen. Splitting it
out keeps the review of a large chunk of new HTML separate from the review of new logic.

**Files:**
- Modify: `index.html` — new section after `screen-nt-build` (which ends at line 7465); new overlay after `nt-how-to-overlay` (ends line 7707); two small edits to `screen-nt-build` and `screen-nt-standby`; one to `screen-nt-summary`
- Modify: `js/engine.js` — `allScreens[]` (line 71) and the NT teardown list (line 698)
- Modify: `js/games/nt.js` — `ntSetRouting` writes to both status elements

**Interfaces:**
- Consumes: nothing
- Produces: element ids `screen-nt-authoring`, `nt-auth-grid`, `nt-auth-routing`, `nt-auth-brush-hint`, `nt-auth-fw-val`, `nt-auth-hp-val`, `btn-nt-auth-{fw,hp}-{minus,plus}`, `btn-nt-auth-rand-{terrain,budget}`, `btn-nt-auth-deploy`, `btn-nt-auth-how-to`, `nt-debug-retry-overlay`, `nt-debug-retry-attempt`, `nt-debug-retry-sub`, `btn-nt-debug-again`, `btn-nt-debug-finish`, `btn-nt-build-clear`, `nt-build-title-label`, `nt-standby-roster`, `nt-summary-caption`

> **Line numbers in this task are from the pre-edit file and shift as you insert.** Every
> insertion below names an anchor *element* as well as a line. After the first insertion,
> re-grep for the anchor id rather than trusting the stated number:
> `grep -n 'screen-nt-build\|nt-how-to-overlay\|nt-build-title\|btn-nt-commit\|nt-standby-msg\|nt-summary-rawms' index.html`

- [ ] **Step 1: Add the Node Editor screen**

In `index.html`, insert immediately after `screen-nt-build` closes (after line 7465):

```html
  <!-- NT NODE EDITOR (Debug Mode) — authors the SAME object ntGenerateNode() returns.
       THE STACK: header + stage + controls are siblings in one centred column. This screen
       is NOT on the legacy sticky-footer whitelist and must never be added to it. -->
  <section id="screen-nt-authoring" style="display:none"
    class="flex items-center justify-center w-full min-h-screen px-4 py-8 overflow-y-auto">
    <div class="flex flex-col w-full max-w-sm gap-3">

      <div class="flex items-center justify-between">
        <p class="text-stone-500 font-semibold text-sm">NODE EDITOR &#x2014; STAGING</p>
        <div class="flex items-center gap-2">
          <button id="btn-nt-auth-how-to" class="text-stone-400 font-bold text-sm active:scale-90 transition-transform duration-100">[?]</button>
          <button class="btn-open-sound text-xl text-stone-400 active:scale-90 transition-transform duration-100">&#x1F50A;</button>
          <button class="btn-nt-quit-open text-stone-500 font-bold text-xl active:scale-90 transition-transform duration-100">&#x2715;</button>
        </div>
      </div>

      <div class="w-full rounded-xl border border-emerald-700/40 bg-slate-900 p-2 flex flex-col gap-1">
        <div class="flex items-center justify-between px-1 text-[10px] font-mono gap-2">
          <span class="text-emerald-400 truncate flex-shrink-0">user:\staging</span>
          <span id="nt-auth-routing" class="text-emerald-400 whitespace-nowrap">ROUTING: VALID</span>
        </div>
        <div id="nt-auth-grid" class="w-full aspect-square bg-slate-950 rounded"></div>
      </div>

      <div class="flex gap-2">
        <button class="pill pill-active-emerald" data-nt-brush="bad">Bad Sector</button>
        <button class="pill" data-nt-brush="native">Honeypot</button>
        <button class="pill" data-nt-brush="ingress">Ingress</button>
        <button class="pill" data-nt-brush="egress">Egress</button>
      </div>
      <p id="nt-auth-brush-hint" class="text-stone-400 text-xs"></p>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <span class="text-stone-500 text-sm font-semibold">Firewall Budget</span>
          <div class="flex items-center gap-3">
            <button id="btn-nt-auth-fw-minus" class="min-h-11 min-w-11 rounded-xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-700 font-bold transition-all duration-150">&#x2212;</button>
            <span id="nt-auth-fw-val" class="text-stone-800 font-mono font-semibold w-8 text-center">0</span>
            <button id="btn-nt-auth-fw-plus" class="min-h-11 min-w-11 rounded-xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-700 font-bold transition-all duration-150">+</button>
          </div>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-stone-500 text-sm font-semibold">Honeypot Budget</span>
          <div class="flex items-center gap-3">
            <button id="btn-nt-auth-hp-minus" class="min-h-11 min-w-11 rounded-xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-700 font-bold transition-all duration-150">&#x2212;</button>
            <span id="nt-auth-hp-val" class="text-stone-800 font-mono font-semibold w-8 text-center">0</span>
            <button id="btn-nt-auth-hp-plus" class="min-h-11 min-w-11 rounded-xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-700 font-bold transition-all duration-150">+</button>
          </div>
        </div>
      </div>

      <div class="flex gap-2">
        <button id="btn-nt-auth-rand-terrain" class="min-h-11 flex-1 rounded-xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-700 font-semibold text-sm transition-all duration-150">Randomise Terrain</button>
        <button id="btn-nt-auth-rand-budget" class="min-h-11 flex-1 rounded-xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-700 font-semibold text-sm transition-all duration-150">Randomise Budget</button>
      </div>

      <button id="btn-nt-auth-deploy" class="min-h-14 w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xl font-semibold transition-all duration-150">
        Deploy Node
      </button>
    </div>
  </section>
```

> **Judgement call, flagged for the `visual-check` in Task 10.** The two Randomise buttons are
> `min-h-11 … text-sm` rather than matching `Deploy Node`'s `min-h-14 … text-xl`. DD-31's
> type-scale rule governs *same-screen buttons representing real, distinct choices* — a primary
> CTA beside a secondary exit. These two are canvas tools, closer in kind to the brush pills
> directly above them than to a competing choice, and they clear the 44 px touch minimum. Making
> them full-height would add ~40 px to the tallest screen in NT, which is exactly risk-register
> item 4 (overflow at `n=20` on a small phone). If `visual-check` shows headroom at 20×20, raise
> them to `min-h-14 text-base` for strict DD-31 conformance.

- [ ] **Step 2: Add the retry overlay**

Insert in `index.html` immediately after `nt-how-to-overlay` closes (after line 7707):

```html
  <!-- NT DEBUG RETRY OVERLAY — Decision Modal, deliberately NON-DISMISSIBLE: both buttons are
       real decisions, so ui-style.md's documented exception applies. That only holds while
       NEITHER id matches engine.js's delegated backdrop-tap pattern
       (cancel|close|done|ok|dismiss as a whole segment). Naming the second button
       btn-nt-debug-done would silently make a backdrop tap finish the player's session. -->
  <div id="nt-debug-retry-overlay" style="display:none"
    class="fixed inset-0 z-[90] overlay-modal-backdrop flex items-center justify-center px-6">
    <div class="overlay-modal-inner bg-stone-50 w-full max-w-sm rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4 text-center border border-emerald-300">
      <div class="flex flex-col gap-2">
        <p class="text-3xl">&#x26A1;</p>
        <h3 class="text-lg font-bold text-stone-800">Trace Complete</h3>
        <p id="nt-debug-retry-attempt" class="text-stone-400 text-xs font-mono">ATTEMPT 1</p>
        <p id="nt-debug-retry-sub" class="text-stone-500 text-sm font-mono"></p>
      </div>
      <button id="btn-nt-debug-again" class="min-h-14 w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-semibold text-lg transition-all duration-150">
        Run Again
      </button>
      <button id="btn-nt-debug-finish" class="min-h-14 w-full rounded-2xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-700 font-semibold text-lg transition-all duration-150">
        Finish Testing
      </button>
    </div>
  </div>
```

- [ ] **Step 3: Three small edits to existing NT markup**

**(a) Build screen title** — replace line 7439 so the static words live in their own span. Both
of the screen's renderers can then set both elements explicitly (the Stack's multi-renderer rule):

```html
        <p id="nt-build-title" class="text-stone-500 font-semibold text-sm"><span id="nt-build-title-label">VULNERABILITY SIMULATION</span> <span id="nt-build-counter">1/5</span></p>
```

**(b) Build screen `Clear All`** — insert directly before `btn-nt-commit` (before line 7461):

```html
      <button id="btn-nt-build-clear" style="display:none" class="min-h-11 w-full rounded-xl bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-700 font-semibold text-sm transition-all duration-150">
        Clear All
      </button>
```

**(c) Standby roster** — insert after the `nt-standby-msg` paragraph (after line 7551):

```html
      <div id="nt-standby-roster" style="display:none" class="flex flex-col gap-2 text-left"></div>
```

**(d) Summary caption** — insert after `nt-summary-rawms` (after line 7528):

```html
        <p id="nt-summary-caption" style="display:none" class="text-stone-400 text-xs"></p>
```

- [ ] **Step 4: Register the screen and the overlay in `engine.js`**

Line 71 — add `'screen-nt-authoring'` to the Net-Trace group:

```js
  // Net-Trace
  'screen-nt-menu', 'screen-nt-setup', 'screen-nt-allocation', 'screen-nt-gate',
  'screen-nt-authoring', 'screen-nt-build', 'screen-nt-playback', 'screen-nt-summary',
  'screen-nt-standby',
```

Line 698 — add `'nt-debug-retry-overlay'` to the teardown list:

```js
  ['nt-settings-overlay','nt-how-to-overlay','nt-quit-overlay','nt-reboot-overlay','nt-logs-overlay','nt-bridge-preview-overlay','nt-debug-retry-overlay'].forEach(id => {
```

- [ ] **Step 5: Make `ntSetRouting` paint both status elements**

The Node Editor reuses the `ROUTING: VALID / EXCEPTION` status verbatim, but each screen owns its
own element (duplicate ids are illegal). In `js/games/nt.js`, replace `ntSetRouting` (line 2295)
with:

```js
// Routing status. The build screen and the Node Editor each own their own element — only one
// screen is ever visible, so writing to both is always correct and never needs a mode branch.
function ntSetRouting(state) {
  const els = ['nt-routing-status', 'nt-auth-routing']
    .map(id => document.getElementById(id)).filter(Boolean);
  if (!els.length) return;
  const paint = (txt, cls) => els.forEach(el => { el.textContent = txt; el.className = cls; });
  if (state === 'exception') {
    ntRoutingState = 'exception';
    paint('ROUTING: EXCEPTION', 'text-red-500 whitespace-nowrap');
    if (ntRoutingTimer) clearTimeout(ntRoutingTimer);
    ntRoutingTimer = setTimeout(() => { ntRoutingTimer = null; ntSetRouting('valid'); }, 700);
  } else if (state === 'storage_insufficient') {
    paint('STORAGE: INSUFFICIENT', 'text-amber-400 whitespace-nowrap');
    if (ntRoutingTimer) clearTimeout(ntRoutingTimer);
    ntRoutingTimer = setTimeout(() => { ntRoutingTimer = null; ntSetRouting('valid'); }, 1200);
  } else {
    ntRoutingState = 'valid';
    paint('ROUTING: VALID', 'text-emerald-400 whitespace-nowrap');
  }
}
```

- [ ] **Step 6: Verify**

```bash
node --check js/games/nt.js && node --check js/engine.js
node tools/verify-nt-loopback.js
grep -c "screen-nt-authoring" js/engine.js index.html    # expect 1 and 1
grep -c "nt-debug-retry-overlay" js/engine.js index.html # expect 1 and 1
```

Expected: 146 checks still green (`ntSetRouting`'s rewrite is behaviour-preserving), and each
grep returns exactly 1 per file.

- [ ] **Step 7: Commit**

```bash
git add index.html js/engine.js js/games/nt.js
git commit -m "feat(nt): Node Editor screen, retry overlay, and engine registration

Adds screen-nt-authoring (THE STACK, not the legacy sticky-footer pattern) and
the non-dismissible nt-debug-retry-overlay, plus the four small markup hooks the
retry loop needs: a build-title label span, a Debug-only Clear All, a standby
roster container and a summary caption.

Both new ids are registered — screen-nt-authoring in allScreens[] (a screen
missing from it is a ghost that never hides) and nt-debug-retry-overlay in
resetToLobby()'s NT teardown list.

ntSetRouting now paints both the build screen's status element and the editor's.
Only one screen is ever visible, so no mode branch is needed.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: The Node Editor controller

The heart of the feature, and the reason it is small. The editor writes **directly into `ntNode`**
with `ntMyPlacements` empty, so `ntBlockAt` (`nt.js:1950`), `ntCellType`, `ntPaintCell`,
`ntRepaintFootprint`, `ntBlockTiles`, `ntIsMouthTile`, `ntPathExists` and `ntFlashReject` all work
untouched — and the editor is WYSIWYG for free: a bad sector looks in the editor exactly as it
will look in play.

**Files:**
- Modify: `js/games/nt.js` — new block after `ntRenderBuildGrid`'s helpers (insert after `ntUpdateBuildCounters`, line 2285); DOMContentLoaded wiring
- Test: `tools/verify-nt-loopback.js`

**Interfaces:**
- Consumes: `ntDrawPortMarker` (Task 3), `ntDebugBrush` (Task 2)
- Produces:
  - `ntAuthBlankNode(): node` — an empty board with opposite mid-edge ports
  - `ntShowAuthoring(): void` — entry point, reached at session start **and** on the Author New Node loop-back
  - `ntRenderAuthGrid(): void`
  - `ntAuthTap(tx, ty): void`
  - `ntAuthPlaceTerrain(tx, ty, asHoneypot): void`
  - `ntAuthRemoveTerrain(block): void`
  - `ntAuthSetPort(tx, ty): void`
  - `ntSyncAuthUI(): void`
  - `ntAuthMaxFirewall(): number`, `ntAuthMaxHoneypot(): number`
  - `ntAuthRandomiseTerrain(): void`, `ntAuthRandomiseBudget(): void`

- [ ] **Step 1: Write the failing test**

Add to `BRIDGE`:

```js
  showAuthoring()  { ntShowAuthoring(); },
  authTap(x, y)    { ntAuthTap(x, y); },
  setBrushDbg(b)   { ntDebugBrush = b; ntSyncAuthUI(); },
  authRandTerrain(){ ntAuthRandomiseTerrain(); },
  authRandBudget() { ntAuthRandomiseBudget(); },
  bumpFw(n)        { ntInventory.firewall += n; ntSyncAuthUI(); },
  bumpHp(n)        { ntInventory.honeypot += n; ntSyncAuthUI(); },
  pathOk()         { return ntPathExists(ntNode, []); },
```

Then append this scenario:

```js
// ── The Node Editor ───────────────────────────────────────────────────────────
section('Node Editor — authoring the same object ntGenerateNode() returns');
(() => {
  const d = makeDevice('editor', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'], scale: 18, natives: 2, debug: true });
  d.__nt.showAuthoring();

  check('opens the Node Editor',      lastScreen(d), 'screen-nt-authoring');
  check('starts on a BLANK board',
        [d.__nt.node.badSectors.length, d.__nt.node.nativeHoneypots.length], [0, 0]);
  check('…which is legal — an empty maze routes',  d.__nt.pathOk(), true);
  check('budget starts at zero',
        [d.__nt.inventory.firewall, d.__nt.inventory.honeypot], [0, 0]);
  check('grid renders every tile',    d.__nt.authCells(), 18 * 18);
  check('…plus the two port markers', d.__nt.authPorts(), 2);
  check('brush defaults to Bad Sector', d.__nt.debugBrush, 'bad');

  // Bad Sector brush — a 2×2 block, anchored and clamped like every other NT placement.
  d.__nt.authTap(4, 4);
  check('one tap draws one Bad Sector', d.__nt.node.badSectors.length, 1);
  check('…written into ntNode, NOT into placements', d.__nt.placements.length, 0);
  d.__nt.authTap(4, 4);
  check('tapping it again erases it',   d.__nt.node.badSectors.length, 0);

  // Native Honeypot brush, capped by the Native Honeypots setting (2 here).
  d.__nt.setBrushDbg('native');
  d.__nt.authTap(4, 4); d.__nt.authTap(8, 8); d.__nt.authTap(12, 12);
  check('native honeypots are capped by ntNativeHoneypots',
        d.__nt.node.nativeHoneypots.length, 2);

  // Budget ceilings.
  d.__nt.bumpFw(999);
  check('firewall budget is capped at the block-slot count ((18/2)² = 81)',
        d.__nt.inventory.firewall, 81);
  d.__nt.bumpFw(-999);
  check('…and floored at zero', d.__nt.inventory.firewall, 0);
  d.__nt.bumpHp(999);
  check('honeypot budget ceiling accounts for the natives already placed (4 − 2)',
        d.__nt.inventory.honeypot, 2);

  // Ports. The two generation heuristics are deliberately NOT enforced on a human author.
  d.__nt.setBrushDbg('ingress');
  d.__nt.authTap(0, 3);
  check('ingress moves to the tapped border tile',
        [d.__nt.node.ingress.edge, d.__nt.node.ingress.idx], ['left', 3]);
  d.__nt.setBrushDbg('egress');
  d.__nt.authTap(0, 5);
  check('egress may sit on the SAME edge as ingress — a human choice, not a bad roll',
        [d.__nt.node.egress.edge, d.__nt.node.egress.idx], ['left', 5]);
  check('…and the node still routes', d.__nt.pathOk(), true);
  d.__nt.authTap(0, 3);
  check('but the two ports may never share one mouth',
        [d.__nt.node.egress.edge, d.__nt.node.egress.idx], ['left', 5]);

  // Randomise — both produce an editable starting point; nothing is committed yet.
  d.__nt.bumpFw(7);
  const budgetBefore = { ...d.__nt.inventory };
  d.__nt.authRandTerrain();
  check('Randomise Terrain fills the board', d.__nt.node.badSectors.length > 0, true);
  check('…and leaves the budget alone (keepInventory)', d.__nt.inventory, budgetBefore);
  check('…and only ever produces a routable node', d.__nt.pathOk(), true);

  const terrainBefore = JSON.stringify(d.__nt.node.badSectors);
  d.__nt.authRandBudget();
  check('Randomise Budget leaves the terrain alone',
        JSON.stringify(d.__nt.node.badSectors), terrainBefore);
  check('…and rolls a firewall budget inside the real match range (6%–30% of 81)',
        d.__nt.inventory.firewall >= 5 && d.__nt.inventory.firewall <= 24, true);

  check('no exceptions anywhere in the editor', errs(d), []);
})();
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node tools/verify-nt-loopback.js
```

Expected: FAIL — `ntShowAuthoring is not defined`.

- [ ] **Step 3: Write the editor**

In `js/games/nt.js`, insert after `ntUpdateBuildCounters` (after line 2285):

```js
// ═══════════════════════════════════════════════════════════════════════════
// NODE EDITOR  (Debug Mode — author the node instead of rolling one)
// ═══════════════════════════════════════════════════════════════════════════
// The editor writes DIRECTLY into ntNode with ntMyPlacements empty. That is the whole trick:
// ntBlockAt / ntCellType / ntPaintCell / ntRepaintFootprint / ntPathExists / ntFlashReject are
// already mode-agnostic, so they need no changes and the editor is WYSIWYG for free — a bad
// sector looks here exactly as it will look in play. ntRenderBuildGrid is NOT reused: its
// pointer handlers are saturated with build semantics (live-inventory tap-cycling, the
// firewall→honeypot long-press upgrade, right-click honeypots, ntUpdateBuildCounters on every
// path, ports as pointer-events:none decorations). Threading a mode branch through all of them
// would put conditional logic on the single render path the loopback harness actually executes.

function ntAuthBlankNode() {
  const n = ntMatrixScale;
  return {
    n,
    ingress: { edge: 'left',  idx: n >> 1 },
    egress:  { edge: 'right', idx: n >> 1 },
    badSectors: [],
    nativeHoneypots: [],
  };
}

// Entry point — reached at session start AND on the Author New Node loop-back from the summary.
// One authoring entry point, reached twice; there is deliberately no second "restart" path.
function ntShowAuthoring() {
  ntDebugBrush   = 'bad';
  ntNode         = ntAuthBlankNode();   // always a fresh sandbox
  ntInventory    = { firewall: 0, honeypot: 0 };
  ntMyPlacements = [];
  ntFirewallUsed = 0;
  ntHoneypotUsed = 0;
  ntDebugMyAttempt     = 0;
  ntDebugBest          = null;
  ntDebugFinished      = [];
  ntDebugAttemptCounts = [];
  showScreen('screen-nt-authoring');
  ntRenderAuthGrid();
  ntSyncAuthUI();
  ntSetRouting('valid');
}

function ntRenderAuthGrid() {
  const old = document.getElementById('nt-auth-grid');
  if (!old || !ntNode) return;
  // Same shallow-clone swap as ntRenderBuildGrid: innerHTML = '' removes children but NOT
  // grid-level listeners, so a re-render would otherwise stack a second pointerup handler.
  const grid = old.cloneNode(false);
  old.parentNode.replaceChild(grid, old);
  const n = ntNode.n;
  grid.innerHTML = '';
  grid.style.display = 'grid';
  grid.style.position = 'relative';
  grid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  grid.style.gap = '1px';
  grid.style.touchAction = 'none';
  ntBuildCells = [];   // shared with the build screen — ntRepaintFootprint/ntFlashReject read it

  for (let ty = 0; ty < n; ty++) {
    ntBuildCells.push([]);
    for (let tx = 0; tx < n; tx++) {
      const cell = document.createElement('div');
      cell.style.aspectRatio = '1';
      ntPaintCell(cell, tx, ty);
      ntBuildCells[ty].push(cell);
      grid.appendChild(cell);
    }
  }

  const getTile = (e) => {
    const rect = grid.getBoundingClientRect();
    return {
      tx: Math.max(0, Math.min(n - 1, Math.floor((e.clientX - rect.left) / rect.width * n))),
      ty: Math.max(0, Math.min(n - 1, Math.floor((e.clientY - rect.top) / rect.height * n))),
    };
  };
  // A brush model: one tap, one meaning, decided by ntDebugBrush. No long-press, no ghost
  // preview, no right-click — those all belong to the build screen's inventory semantics.
  grid.addEventListener('pointerup', (e) => {
    e.preventDefault();
    const { tx, ty } = getTile(e);
    ntAuthTap(tx, ty);
  });
  grid.addEventListener('contextmenu', e => e.preventDefault());

  ntDrawPortMarker(grid, ntNode.ingress, '#34d399', true, n);
  ntDrawPortMarker(grid, ntNode.egress,  NT_COLOR_BAD_SECTOR, false, n);
}

function ntAuthTap(tx, ty) {
  if (ntDebugBrush === 'ingress' || ntDebugBrush === 'egress') { ntAuthSetPort(tx, ty); return; }
  const b = ntBlockAt(tx, ty);
  if (b && (b.source === 'bad' || b.source === 'native')) { ntAuthRemoveTerrain(b); return; }
  ntAuthPlaceTerrain(tx, ty, ntDebugBrush === 'native');
}

function ntAuthPlaceTerrain(tx, ty, asHoneypot) {
  const n = ntNode.n;
  const ax = Math.max(0, Math.min(tx, n - 2)), ay = Math.max(0, Math.min(ty, n - 2));
  // Strict zero-overlap, exactly as ntAttemptPlace enforces it during Build.
  for (const [fx, fy] of ntBlockTiles(ax, ay)) {
    if (ntBlockAt(fx, fy) || ntIsMouthTile(fx, fy)) { ntFlashReject(ntBuildCells[ty] && ntBuildCells[ty][tx]); return; }
  }
  if (asHoneypot && ntNode.nativeHoneypots.length >= ntNativeHoneypots) {
    playBoing(); ntSetRouting('storage_insufficient'); return;
  }
  // Validity gate — the authored node must route with NO player hardening on it, which is the
  // same guarantee ntGenerateNode gives (`ntPathExists(candidate, [])`, nt.js:1714).
  const target = asHoneypot ? ntNode.nativeHoneypots : ntNode.badSectors;
  target.push({ ax, ay });
  if (!ntPathExists(ntNode, [])) {
    target.pop();
    ntFlashReject(ntBuildCells[ty] && ntBuildCells[ty][tx]);
    return;
  }
  playPillClick();
  ntSetRouting('valid');
  ntRepaintFootprint(ax, ay);
  ntSyncAuthUI();
}

// Removing terrain only ever OPENS the board, so it can never break validity — no re-check.
function ntAuthRemoveTerrain(b) {
  const drop = arr => arr.filter(c => !(c.ax === b.ax && c.ay === b.ay));
  ntNode.badSectors      = drop(ntNode.badSectors);
  ntNode.nativeHoneypots = drop(ntNode.nativeHoneypots);
  playWhoosh();
  ntRepaintFootprint(b.ax, b.ay);
  ntSyncAuthUI();
}

// Arm the Ingress or Egress brush, then tap any tile — the port snaps to that tile's NEAREST
// border. Reuses the grid's own getTile maths, so no drag interaction is needed.
//
// Two of ntGenerateNode's constraints are deliberately NOT enforced here:
//   • the corner-proximity re-roll (|imx−emx| + |imy−emy| < 8, nt.js:1695)
//   • the different-edges rule (while (egress.edge === ingress.edge), nt.js:1692)
// Both exist to keep RANDOMLY ROLLED nodes varied. An author placing two ports close together,
// or on the same edge, is making a choice — blocking it would be the tool second-guessing its
// user. The two genuine constraints remain: the mouths must differ, and the node must route.
function ntAuthSetPort(tx, ty) {
  const n = ntNode.n;
  const nearest = [
    { edge: 'top',    d: ty,         idx: tx },
    { edge: 'bottom', d: n - 1 - ty, idx: tx },
    { edge: 'left',   d: tx,         idx: ty },
    { edge: 'right',  d: n - 1 - tx, idx: ty },
  ].sort((a, b) => a.d - b.d)[0];
  const pick  = { edge: nearest.edge, idx: nearest.idx };
  const key   = ntDebugBrush;                                    // 'ingress' | 'egress'
  const other = key === 'ingress' ? ntNode.egress : ntNode.ingress;
  if (pick.edge === other.edge && pick.idx === other.idx) {
    ntFlashReject(ntBuildCells[ty] && ntBuildCells[ty][tx]);      // ingress mouth ≠ egress mouth
    return;
  }
  const prev = ntNode[key];
  ntNode[key] = pick;
  if (!ntPathExists(ntNode, [])) {
    ntNode[key] = prev;
    ntFlashReject(ntBuildCells[ty] && ntBuildCells[ty][tx]);
    return;
  }
  playPillClick();
  ntSetRouting('valid');
  ntRenderAuthGrid();   // port markers are appended to the grid — a full re-render moves them
}

// Budget ceilings, both lifted from ntGenerateNode's own roll (nt.js:1730–1731).
function ntAuthMaxFirewall() {
  const n = ntNode ? ntNode.n : ntMatrixScale;
  return Math.pow(Math.floor(n / NT_BLOCK), 2);                  // "slots" — the roll's ceiling
}
function ntAuthMaxHoneypot() {
  return Math.max(0, NT_HONEYPOT_CAP - (ntNode ? ntNode.nativeHoneypots.length : 0));
}

function ntSyncAuthUI() {
  // Clamp here rather than at each stepper: removing a native honeypot RAISES the honeypot
  // ceiling and adding one lowers it, so the budget has to be re-clamped after a terrain edit
  // too — one place, every path.
  ntInventory.firewall = Math.max(0, Math.min(ntInventory.firewall, ntAuthMaxFirewall()));
  ntInventory.honeypot = Math.max(0, Math.min(ntInventory.honeypot, ntAuthMaxHoneypot()));
  const fw = document.getElementById('nt-auth-fw-val');
  const hp = document.getElementById('nt-auth-hp-val');
  if (fw) fw.textContent = String(ntInventory.firewall);
  if (hp) hp.textContent = String(ntInventory.honeypot);
  // Only pill-active-emerald is ever added or removed — .pill always stays.
  document.querySelectorAll('[data-nt-brush]').forEach(b => {
    b.classList.toggle('pill-active-emerald', b.dataset.ntBrush === ntDebugBrush);
  });
  const hint = document.getElementById('nt-auth-brush-hint');
  if (hint) {
    const natives = ntNode ? ntNode.nativeHoneypots.length : 0;
    hint.textContent = {
      bad:     'Tap to draw a Bad Sector. Tap it again to erase.',
      native:  `Tap to drop a Native Honeypot — ${natives} of ${ntNativeHoneypots} placed.`,
      ingress: 'Tap anywhere to move the Ingress port to the nearest edge.',
      egress:  'Tap anywhere to move the Egress port to the nearest edge.',
    }[ntDebugBrush] || '';
  }
}

// Randomise Terrain — ntGenerateNode(true) already means exactly "re-roll the geometry, leave
// the budget alone" (its keepInventory argument, nt.js:1728). A parameter reuse, not new logic.
function ntAuthRandomiseTerrain() {
  ntGenerateNode(true);
  ntRenderAuthGrid();
  ntSyncAuthUI();
  ntSetRouting('valid');
}

// Randomise Budget — the two expressions ntGenerateNode uses for its own roll (nt.js:1730–1731),
// so a sandbox budget always lands in the range a real match would have dealt.
function ntAuthRandomiseBudget() {
  const slots = Math.pow(Math.floor(ntNode.n / NT_BLOCK), 2);
  ntInventory = {
    firewall: ntRandInt(Math.round(NT_FIREWALL_MIN_PCT * slots), Math.round(NT_FIREWALL_MAX_PCT * slots)),
    honeypot: ntRandInt(0, Math.min(NT_ALLOC_HONEYPOT_CAP, NT_HONEYPOT_CAP - ntNode.nativeHoneypots.length)),
  };
  ntSyncAuthUI();
}
```

- [ ] **Step 4: Wire the controls**

In `js/games/nt.js`, inside `DOMContentLoaded`, after the `btn-nt-commit` listener (line 3541):

```js
  // ── Node Editor (Debug Mode) ────────────────────────────────────────────────
  document.querySelectorAll('[data-nt-brush]').forEach(b => b.addEventListener('click', () => {
    playPillClick(); ntDebugBrush = b.dataset.ntBrush; ntSyncAuthUI();
  }));
  // ntSyncAuthUI clamps, so a bare ++/-- can never leave the budget out of range.
  document.getElementById('btn-nt-auth-fw-minus').addEventListener('click', () => { playPillClick(); ntInventory.firewall--; ntSyncAuthUI(); });
  document.getElementById('btn-nt-auth-fw-plus') .addEventListener('click', () => { playPillClick(); ntInventory.firewall++; ntSyncAuthUI(); });
  document.getElementById('btn-nt-auth-hp-minus').addEventListener('click', () => { playPillClick(); ntInventory.honeypot--; ntSyncAuthUI(); });
  document.getElementById('btn-nt-auth-hp-plus') .addEventListener('click', () => { playPillClick(); ntInventory.honeypot++; ntSyncAuthUI(); });
  document.getElementById('btn-nt-auth-rand-terrain').addEventListener('click', () => { playWhoosh(); ntAuthRandomiseTerrain(); });
  document.getElementById('btn-nt-auth-rand-budget') .addEventListener('click', () => { playWhoosh(); ntAuthRandomiseBudget(); });
  document.getElementById('btn-nt-auth-how-to').addEventListener('click', ntOpenHowTo);
```

`btn-nt-auth-deploy` is wired in Task 6, when `ntDeployNode` exists.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
node --check js/games/nt.js && node tools/verify-nt-loopback.js
```

Expected: PASS on every new check, 146 existing still green.

- [ ] **Step 6: Sweep seeds** (`Randomise Terrain` and `Randomise Budget` are RNG-driven)

```bash
for s in 1 2 3 4 5 6 7 8; do NT_SEED=$s node tools/verify-nt-loopback.js | tail -3; done
```

- [ ] **Step 7: Commit**

```bash
git add js/games/nt.js tools/verify-nt-loopback.js
git commit -m "feat(nt): the Node Editor controller

Authors straight into ntNode with ntMyPlacements empty, which is what makes the
editor WYSIWYG for free — ntBlockAt, ntCellType, ntPaintCell, ntRepaintFootprint,
ntPathExists and ntFlashReject are already mode-agnostic and take no changes.
A brush model (bad sector / native honeypot / ingress / egress), budget steppers
clamped by ntGenerateNode's own ceilings, and two independent randomisers:
Randomise Terrain is ntGenerateNode(true), whose keepInventory argument already
means exactly 're-roll geometry, keep the budget'.

Two generation heuristics are deliberately NOT enforced on a human author —
corner-proximity and different-edges. Both exist to keep randomly rolled nodes
varied; an author placing two ports close together is making a choice.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: Deploy Node, and routing into the editor

`NT_GENERATE` is reused **verbatim** — the authored node takes exactly the place a rolled one
takes. Its applier already calls `ntNormaliseNode`, which repairs both `badSectors` and
`nativeHoneypots`; this task's tests are what turn that from an assumption into a guarantee.

**Files:**
- Modify: `js/games/nt.js` — `ntStartSolo` (219), `ntStartPTP` (238), `ntStartSession` (551); new `ntDeployNode`; the `NT_GENERATE` applier (3218); DOMContentLoaded wiring
- Test: `tools/verify-nt-loopback.js`

**Interfaces:**
- Consumes: `ntShowAuthoring` (Task 5)
- Produces: `ntDeployNode(): void`

- [ ] **Step 1: Write the failing test**

Append this scenario:

```js
// ── Deploying an authored node over the wire ──────────────────────────────────
section('Deploy Node — an authored node is shape-identical to a rolled one');
(() => {
  const r = makeRoom(['Ali', 'Bec', 'Cam']);
  seatAll(r, { win: 90, debug: true });

  // The host authors an ENTIRELY EMPTY node — no bad sectors, no native honeypots. This is
  // legitimate ("what is the baseline latency with no hardening at all?") and IMPOSSIBLE to
  // produce today, because ntGenerateNode has a bad-sector density floor. It is also the most
  // dangerous shape on the wire: Firebase deletes an empty array, so both collections vanish
  // in flight and every unguarded render read throws per grid cell (NT's own BUG-15/16).
  r.host.__nt.showAuthoring();
  check('host is in the editor',   lastScreen(r.host), 'screen-nt-authoring');
  check('the authored node is bare',
        [r.host.__nt.node.badSectors.length, r.host.__nt.node.nativeHoneypots.length], [0, 0]);

  r.host.__nt.deploy();
  r.all.forEach(drain);

  check('NT_GENERATE is reused verbatim — no new packet', r.sent.includes('NT_GENERATE'), true);
  check('every device landed on the gate',
        r.all.map(lastScreen), ['screen-nt-gate', 'screen-nt-gate', 'screen-nt-gate']);
  check('clients rebuilt badSectors after the wire erased it',
        r.clients.map(c => Array.isArray(c.__nt.node.badSectors)), [true, true]);
  check('…and nativeHoneypots too',
        r.clients.map(c => Array.isArray(c.__nt.node.nativeHoneypots)), [true, true]);
  check('clients agree with the host on the ports',
        r.clients.map(c => c.__nt.node.ingress.idx),
        [r.host.__nt.node.ingress.idx, r.host.__nt.node.ingress.idx]);

  // The real test of hazard 2: the grid must RENDER on a client without throwing.
  r.clients.forEach(c => c.__nt.renderGrid());
  check('an empty authored node renders on both clients',
        r.clients.map(c => c.__nt.gridCells()), [18 * 18, 18 * 18]);
  check('…with no exceptions anywhere', r.all.map(errs), [[], [], []]);

  // Sizing rule — the readiness arrays are length-N, never [].
  check('ntDebugFinished is length-N all-false, NOT []',
        r.host.__nt.debugFinished, [false, false, false]);
  check('ntDebugAttemptCounts is length-N all-zero, NOT []',
        r.host.__nt.debugCounts, [0, 0, 0]);
})();
```

Add to `BRIDGE`:

```js
  deploy()         { ntDeployNode(); },
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node tools/verify-nt-loopback.js
```

Expected: FAIL — `ntDeployNode is not defined`.

- [ ] **Step 3: Write `ntDeployNode`**

In `js/games/nt.js`, immediately after `ntAuthRandomiseBudget` (end of the Node Editor block):

```js
// Deploy Node — the authored node takes exactly the place ntGenerateNode()'s output takes in a
// Standard match, so NT_GENERATE is reused verbatim and everything downstream (path validity,
// timeline simulation, playback, SER scoring, the summary) is untouched.
function ntDeployNode() {
  ntCycle              = 0;      // Debug is single-node: the cycle counter never advances
  ntCycleSERs          = [];
  ntTeamCycleSERs      = [];
  ntCycleLatencies     = [];
  ntOverallSER         = [];
  ntAllCycleTimelines  = [];
  ntAllCyclePlacements = [];
  ntAllCycleNodes      = [];
  ntPtpTurn            = 0;
  ntPtpTimelines       = [];
  ntPtpPlacements      = Array.from({ length: ntPlayerCount }, () => []); // pre-sized, no holes
  ntGateReadyCheck     = new Array(ntPlayerCount).fill(false);
  ntCommitReadyCheck   = new Array(ntPlayerCount).fill(false);
  ntSummaryReadyCheck  = new Array(ntPlayerCount).fill(false);
  ntCycleResolved      = false;
  // Sizing rule — LOAD-BEARING. [].every(Boolean) is true, so leaving either of these as []
  // would resolve the whole sandbox on the FIRST player's Finish while everyone else is still
  // building. Same shape as CJAR BUG-05 (logic-engine.md § MDLM Patterns).
  ntDebugFinished      = new Array(ntPlayerCount).fill(false);
  ntDebugAttemptCounts = new Array(ntPlayerCount).fill(0);
  ntDebugMyAttempt     = 0;
  ntDebugBest          = null;
  ntMyPlacements = [];
  ntFirewallUsed = 0;
  ntHoneypotUsed = 0;

  if (window.syllyMultiplayerMode === 'host') {
    mpSendEnvelope({
      type: 'SYNC',
      payload: { action: 'NT_GENERATE', cycle: 0, node: ntNode, inventory: ntInventory, debug: true },
    });
    ntShowMdlmGate();
  } else {
    // Solo and PTP alike — solo is PTP with one admin, exactly as ntBeginCycle treats it.
    ntBeginPtpTurn();
  }
}
```

- [ ] **Step 4: Route the three entry points into the editor**

`ntStartSolo` (line 219):

```js
function ntStartSolo() {
  ntPlayerCount = 1;
  ntCycle = 0;
  if (ntDebugMode) { ntShowAuthoring(); return; }
  ntBeginCycle();
}
```

`ntStartPTP` (line 238) — replace its final `ntBeginCycle();` with:

```js
  if (ntDebugMode) { ntShowAuthoring(); return; }
  ntBeginCycle();
```

`ntStartSession` (line 563–567) — replace the host/client branch with:

```js
  if (window.syllyMultiplayerMode === 'host') {
    if (ntDebugMode) ntShowAuthoring();
    else ntStartMatch();
  } else {
    ntShowStandby(ntDebugMode ? 'Authoring node…' : 'Booting cluster…');
  }
```

- [ ] **Step 5: Guard the `NT_GENERATE` applier's Debug fields**

In the `NT_GENERATE` SYNC applier (line 3218), add the two Debug lines after
`ntSummaryReadyCheck` is reset:

```js
      if (payload.debug) {
        // Client-side sizing. The host holds the authoritative ntDebugFinished; these are the
        // client's own display copies and must still never be left as [].
        ntDebugFinished      = new Array(ntPlayerCount).fill(false);
        ntDebugAttemptCounts = new Array(ntPlayerCount).fill(0);
        ntDebugMyAttempt     = 0;
        ntDebugBest          = null;
      }
```

`ntNode = ntNormaliseNode(payload.node);` on line 3234 is already correct and needs no change —
that is precisely the guard that keeps an empty authored node renderable.

- [ ] **Step 6: Wire the Deploy button**

In `DOMContentLoaded`, alongside the other Node Editor listeners from Task 5:

```js
  document.getElementById('btn-nt-auth-deploy').addEventListener('click', () => { playLaunch(); ntDeployNode(); });
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
node --check js/games/nt.js && node tools/verify-nt-loopback.js
```

- [ ] **Step 8: Prove the empty-node check is real, not a rubber stamp**

```bash
mkdir -p /tmp/nt-revert
# Revert ONLY the normalise call, leaving everything else in place.
sed 's/ntNode = ntNormaliseNode(payload.node);/ntNode = payload.node;/' \
  js/games/nt.js > /tmp/nt-revert/nt.js
NT_SRC=/tmp/nt-revert/nt.js node tools/verify-nt-loopback.js
```

Expected: **FAIL** on "an empty authored node renders on both clients" and on
"no exceptions anywhere". If it passes, the check is not testing what it claims — fix the check,
not the code.

- [ ] **Step 9: Sweep seeds and commit**

```bash
for s in 1 2 3 4 5 6 7 8; do NT_SEED=$s node tools/verify-nt-loopback.js | tail -3; done
git add js/games/nt.js tools/verify-nt-loopback.js
git commit -m "feat(nt): Deploy Node, and route solo/PTP/MDLM into the editor

An authored node is shape-identical to a rolled one, so NT_GENERATE carries it
verbatim and nothing downstream changes. ntDeployNode sizes every per-seat array
to ntPlayerCount — never [], because [].every(Boolean) is true and would resolve
the sandbox on the first player's Finish.

Harness: an ENTIRELY EMPTY authored node (no bad sectors, no native honeypots)
now round-trips the wire and renders on both clients. That shape is legitimate in
a sandbox and impossible today, since ntGenerateNode has a density floor — and it
is the exact class of NT's BUG-15/16. Proven to fail against a copy with the
ntNormaliseNode call reverted.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: The retry loop

Each attempt resolves **locally**. `ntComputeTimeline_local()` is pure — same node plus same
placements gives the same timeline on every device — so a player on attempt 11 has sent exactly as
many packets as one on attempt 1: **zero**. The network is touched only twice all round.

**Files:**
- Modify: `js/games/nt.js` — `ntShowBuild` (1339); `ntCommit` (2377); new retry block; DOMContentLoaded wiring
- Test: `tools/verify-nt-loopback.js`

**Interfaces:**
- Consumes: `ntDebugMyAttempt`, `ntDebugBest` (Task 2)
- Produces:
  - `ntDebugRunAttempt(): void` — resolves one attempt locally and opens playback
  - `ntDebugOpenRetry(latency, isBest, prevBest): void`
  - `ntDebugRunAgain(): void`

- [ ] **Step 1: Write the failing test**

```js
// ── The retry loop ────────────────────────────────────────────────────────────
section('Retry loop — unlimited attempts, zero packets');
(() => {
  const r = makeRoom(['Ali', 'Bec']);
  seatAll(r, { win: 90, debug: true });
  r.host.__nt.showAuthoring();
  r.host.__nt.authRandTerrain();
  r.host.__nt.bumpFw(8);
  r.host.__nt.deploy();
  r.all.forEach(drain);

  const client = r.clients[0];
  // makeRoom's `sent` array records the HOST's sends only, so counting it would prove nothing
  // about a client's packets. Tap this client's own send instead — the claim under test is
  // "a retrying player sends nothing", and this is the only way to actually observe that.
  const clientPackets = [];
  const clientSend = client.mpSendEnvelope;
  client.mpSendEnvelope = env => { clientPackets.push(env.payload.action); return clientSend(env); };

  client.__nt.showBuild();
  check('build screen header reads ATTEMPT, not the cycle counter',
        client.__nt.text('nt-build-title-label'), 'STAGING — ATTEMPT');
  check('…starting at 1',        client.__nt.buildCounter(), '1');
  check('Clear All is offered in Debug', client.__nt.shown('btn-nt-build-clear'), true);
  check('the timer shows ∞',     client.__nt.text('nt-build-timer'), '∞');

  // Attempt 1 — an EMPTY build. Legitimate: it is how you measure baseline latency.
  client.__nt.commit();
  check('attempt 1 counted',      client.__nt.debugAttempt, 1);
  check('…and became the best by default', client.__nt.debugBest !== null, true);
  check('attempt 1 sent NO packet', clientPackets, []);

  const first = client.__nt.debugBest;
  client.__nt.runAgain();
  check('Run Again returns to the build screen', lastScreen(client), 'screen-nt-build');
  check('…and the header advances', client.__nt.buildCounter(), '2');

  // Attempt 2 — a real build. More hardening means a LONGER trace, which in NT is BETTER:
  // the defender is slowing the intruder down, and the longest delay scores 100% SER.
  client.__nt.setPlacements([{ ax: 4, ay: 4, type: 'firewall' }, { ax: 8, ay: 8, type: 'firewall' }]);
  client.__nt.commit();
  check('attempt 2 counted',      client.__nt.debugAttempt, 2);
  check('a slower trace is a NEW BEST (higher latency wins in NT)',
        client.__nt.debugBest >= first, true);
  const second = client.__nt.debugBest;

  // Attempt 3 — deliberately worse. Best must NOT regress to "last".
  client.__nt.runAgain();
  client.__nt.setPlacements([]);
  client.__nt.commit();
  check('attempt 3 counted',      client.__nt.debugAttempt, 3);
  check('best is BEST, not LAST', client.__nt.debugBest, second);
  check('three attempts still sent NO packets', clientPackets, []);
  check('no exceptions', r.all.map(errs), [[], []]);
})();
```

Add to `BRIDGE`:

```js
  runAgain()       { ntDebugRunAgain(); },
  runAttempt()     { ntDebugRunAttempt(); },
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node tools/verify-nt-loopback.js
```

Expected: FAIL — `nt-build-title-label` reads `VULNERABILITY SIMULATION`, and
`ntDebugRunAgain is not defined`.

- [ ] **Step 3: Make `ntShowBuild` Debug-aware**

In `js/games/nt.js`, replace lines 1347–1348 of `ntShowBuild` with:

```js
  // Two renderers now write this header, so BOTH elements are set on BOTH paths — leaving one
  // alone shows whatever the other last wrote (ui-style.md, the Stack's multi-renderer rule).
  const label   = document.getElementById('nt-build-title-label');
  const counter = document.getElementById('nt-build-counter');
  if (label)   label.textContent   = ntDebugMode ? 'STAGING — ATTEMPT' : 'VULNERABILITY SIMULATION';
  if (counter) counter.textContent = ntDebugMode ? String(ntDebugMyAttempt + 1)
                                                 : `${ntCycle + 1}/${ntIterations}`;
  const clearBtn = document.getElementById('btn-nt-build-clear');
  if (clearBtn) clearBtn.style.display = ntDebugMode ? '' : 'none';
```

`ntCommitted = false;` on line 1341 already resets the one-commit-per-phase guard on every entry,
so spec hazard 2 needs no separate fix — `ntDebugRunAgain` routes through `ntShowBuild`.

- [ ] **Step 4: Branch `ntCommit` and write the retry loop**

Add one line at the very top of `ntCommit` (line 2377):

```js
function ntCommit() {
  if (ntDebugMode) { ntDebugRunAttempt(); return; }
  if (ntCommitted) return;        // one commit per build phase (timer expiry + manual tap both call this)
```

Then add the retry block at the end of the Node Editor section (after `ntDeployNode`):

```js
// ── The sandbox retry loop ────────────────────────────────────────────────────
// ntComputeTimeline_local() is a PURE function: same node + same placements ⇒ same timeline, on
// every device, every time. So an attempt resolves entirely locally and costs no packet at all.
// A player on attempt 11 has sent exactly as many as one on attempt 1: zero. The network is
// touched twice all round — the host publishing the node, and each player declaring Finish.
function ntDebugRunAttempt() {
  ntStopBuildTimer();
  ntDebugMyAttempt++;
  const timeline = ntComputeTimeline_local();
  const latency  = timeline ? timeline.latencyMs : 0;
  // HIGHER latency is BETTER in Net-Trace — the defender is slowing the intruder down, and the
  // longest delay each cycle scores 100% SER (ntResolveCyclePtp / ntResolveCycleMdlm both do
  // `lat / maxLat`). So "best" is the SLOWEST trace and an improvement is a POSITIVE delta.
  const prevBest = ntDebugBest ? ntDebugBest.latencyMs : null;
  const isBest   = prevBest === null || latency > prevBest;
  if (isBest) ntDebugBest = { latencyMs: latency, placements: ntMyPlacements.slice(), timeline };

  ntPlaybackTimeline = timeline;
  const panel = document.getElementById('nt-comparison-panel');
  if (panel) panel.style.display = 'none';     // sandbox: you watch your own trace, not a field
  // Reuse the playback screen's own Continue button rather than adding a second exit from it.
  ntPlaybackContinueCallback = () => ntDebugOpenRetry(latency, isBest, prevBest);
  ntShowPlayback();
}

function ntDebugOpenRetry(latency, isBest, prevBest) {
  const att = document.getElementById('nt-debug-retry-attempt');
  if (att) att.textContent = 'ATTEMPT ' + ntDebugMyAttempt;
  const sub = document.getElementById('nt-debug-retry-sub');
  if (sub) {
    sub.textContent = ntFmtMs(latency) + (
      prevBest === null ? ' · first trace'
      : isBest          ? ' · NEW BEST +' + ntFmtMs(latency - prevBest)
                        : ' · best remains ' + ntFmtMs(prevBest)
    );
  }
  const ov = document.getElementById('nt-debug-retry-overlay');
  if (ov) ov.style.display = 'flex';
}

// Previous placements stay put — tweak-one-wall-and-re-run is the whole point of the mode.
// Clear All (build screen, Debug only) is the way to start an attempt from nothing.
function ntDebugRunAgain() {
  const ov = document.getElementById('nt-debug-retry-overlay');
  if (ov) ov.style.display = 'none';
  ntStopPlayback();
  ntShowBuild();      // resets ntCommitted; ntMyPlacements deliberately survives
}
```

- [ ] **Step 5: Wire the buttons**

In `DOMContentLoaded`, alongside the other Debug listeners:

```js
  document.getElementById('btn-nt-debug-again').addEventListener('click', () => { playLaunch(); ntDebugRunAgain(); });
  document.getElementById('btn-nt-build-clear').addEventListener('click', () => {
    playWhoosh();
    ntMyPlacements = [];
    ntRenderBuildGrid();      // repaints every cell and calls ntUpdateBuildCounters itself
    ntSetRouting('valid');
  });
```

`btn-nt-debug-finish` is wired in Task 8.

- [ ] **Step 6: Run the tests to verify they pass**

```bash
node --check js/games/nt.js && node tools/verify-nt-loopback.js
for s in 1 2 3 4 5 6 7 8; do NT_SEED=$s node tools/verify-nt-loopback.js | tail -3; done
```

- [ ] **Step 7: Commit**

```bash
git add js/games/nt.js tools/verify-nt-loopback.js
git commit -m "feat(nt): the sandbox retry loop — unlimited attempts, zero packets

ntComputeTimeline_local() is pure, so each attempt resolves locally and costs no
packet: a player on attempt 11 has sent as many as one on attempt 1, which is
none. The network is touched twice all round.

Best is the HIGHEST latency, not the lowest. The design spec had this backwards;
the defender is slowing the intruder down, and NT scores the longest delay at
100% SER (index.html's own How to Play says so, and both resolve functions
compute lat / maxLat). An improvement therefore renders as NEW BEST +N ms.

Placements survive Run Again — tweak-one-wall-and-re-run is the point of the
mode — with a Debug-only Clear All for starting from nothing.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: Finish, the readiness gate, and the standby roster

The only genuinely new readiness shape in the feature: players finish at different times, so the
gate must be sized and the host must mark its own slot directly.

**Files:**
- Modify: `js/games/nt.js` — `ntShowStandby` (1444); new finish/roster block; `ntHandleEnvelope` ACTION + SYNC; DOMContentLoaded wiring
- Test: `tools/verify-nt-loopback.js`

**Interfaces:**
- Consumes: `ntDebugBest`, `ntDebugFinished`, `ntDebugAttemptCounts` (Task 2), `ntDebugRunAttempt` (Task 7)
- Produces:
  - `ntShowStandby(msg, roster): void` — **signature change**, second parameter optional
  - `ntRenderDebugRoster(rows | null): void`
  - `ntDebugRosterRows(): Array<{name, done, attempts}>`
  - `ntDebugBroadcastRoster(): void`
  - `ntDebugFinish(): void`
  - Packets: `NT_DEBUG_FINISH` (ACTION client→host), `NT_DEBUG_ROSTER` (SYNC host→all)

- [ ] **Step 1: Write the failing test**

```js
// ── Finish, and the per-player readiness gate ─────────────────────────────────
section('Finish — a gate that must not be vacuous');
(() => {
  const r = makeRoom(['Ali', 'Bec', 'Cam']);
  seatAll(r, { win: 90, debug: true });
  r.host.__nt.showAuthoring();
  r.host.__nt.authRandTerrain();
  r.host.__nt.deploy();
  r.all.forEach(drain);

  // Every device runs one attempt, then finishes one at a time.
  r.all.forEach(d => { d.__nt.showBuild(); d.__nt.commit(); });

  // Client 1 finishes with an EMPTY build — normal in a sandbox, and the array Firebase
  // deletes in flight. Without `payload.bestPlacements || []` the host reads undefined and
  // ntResolveCycleMdlm maps over it and throws, stranding the entire room.
  r.clients[0].__nt.setBest([]);
  r.clients[0].__nt.finish();
  check('host recorded seat 1 as finished', r.host.__nt.debugFinished, [false, true, false]);
  check('…and kept an ARRAY for their empty best build',
        Array.isArray(r.host.__nt.ptpPlacements[1]), true);
  check('the round has NOT resolved on one Finish', r.host.__nt.cycleResolved, false);
  check('…and nobody was swept to playback',
        r.all.map(lastScreen).includes('screen-nt-playback'), false);

  // The host finishes — marking its OWN slot directly. A self-sent ACTION would be dropped by
  // the dedup guard (originId === syllyDeviceUid), which is NT's own BUG-05.
  r.host.__nt.finish();
  check('host marked its own slot',           r.host.__nt.debugFinished, [true, true, false]);
  // `sent` records the HOST's sends, so this is a direct observation of the claim: a self-sent
  // ACTION would appear here and would then be dropped by the dedup guard, leaving the slot
  // unset and the round hung forever.
  check('…and sent no NT_DEBUG_FINISH of its own',
        r.sent.includes('NT_DEBUG_FINISH'), false);
  check('still not resolved — one seat outstanding', r.host.__nt.cycleResolved, false);

  // The roster reaches every device.
  r.all.forEach(drain);
  check('clients see the roster',
        r.clients.map(c => c.__nt.debugFinished), [[true, true, false], [true, true, false]]);
  check('roster renders one row per player', r.host.__nt.rosterRows(), 3);

  // The last Finish resolves.
  r.clients[1].__nt.finish();
  r.all.forEach(drain);
  check('all finished — the round resolves', r.host.__nt.cycleResolved, true);
  check('…and everyone reaches playback',
        r.all.map(lastScreen), ['screen-nt-playback', 'screen-nt-playback', 'screen-nt-playback']);
  check('no exceptions anywhere', r.all.map(errs), [[], [], []]);
})();

// ── No forced resolution while a player is still retrying ─────────────────────
section('Retrying players are never swept aside by a deadline');
(() => {
  const r = makeRoom(['Ali', 'Bec']);
  seatAll(r, { win: 45, debug: true });   // a REAL window is configured — Debug supersedes it
  r.host.__nt.showAuthoring();
  r.host.__nt.authRandTerrain();
  r.host.__nt.deploy();
  r.all.forEach(drain);
  r.all.forEach(d => { d.__nt.showBuild(); d.__nt.commit(); });
  r.host.__nt.finish();

  // Pump the host's timers well past what would have been the build deadline (45 s + the 4 s
  // resolve-guard margin), with one player still mid-retry. Stated behaviourally rather than
  // as "the guard is unarmed", so it also catches any OTHER route to a premature resolve.
  for (let i = 0; i < 40; i++) step(r.host, 120000);
  check('the round has NOT resolved with a player still testing',
        r.host.__nt.cycleResolved, false);
  check('…and the retrying client is still on its own screen',
        lastScreen(r.clients[0]) !== 'screen-nt-summary', true);
  check('no exceptions', r.all.map(errs), [[], []]);
})();
```

Add to `BRIDGE`:

```js
  finish()         { ntDebugFinish(); },
  setBest(p)       { ntDebugBest = { latencyMs: 1000, placements: p.slice(), timeline: ntComputeTimeline_local() }; },
  // The mock's innerHTML setter parses every id/class-bearing tag FLAT, so a raw children.length
  // would also count the two spans inside each row. Filter to the row wrapper's own class.
  rosterRows()     { return document.getElementById('nt-standby-roster').children
                       .filter(c => /rounded-xl/.test(c.className || '')).length; },
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node tools/verify-nt-loopback.js
```

Expected: FAIL — `ntDebugFinish is not defined`.

- [ ] **Step 3: Give `ntShowStandby` a second renderer, safely**

Replace `ntShowStandby` (line 1444) with:

```js
// Two things now live on this screen, so EVERY path sets BOTH — a caller that "leaves the
// roster alone" is really showing whatever the previous caller last wrote (ui-style.md, the
// Stack's multi-renderer rule). Existing single-argument callers pass roster === undefined,
// which explicitly blanks it; no call site needs editing.
function ntShowStandby(msg, roster) {
  const el = document.getElementById('nt-standby-msg');
  if (el && msg) el.textContent = msg;
  ntRenderDebugRoster(roster || null);
  showScreen('screen-nt-standby');
}

function ntRenderDebugRoster(rows) {
  const box = document.getElementById('nt-standby-roster');
  if (!box) return;
  if (!rows || !rows.length) { box.innerHTML = ''; box.style.display = 'none'; return; }
  box.style.display = 'flex';
  box.innerHTML = rows.map(r =>
    `<div class="flex items-center justify-between bg-white rounded-xl px-4 py-2 text-sm">
       <span class="text-stone-500 font-mono">${r.done ? '✓' : '⋯'} ${r.name}</span>
       <span class="text-stone-400 font-mono text-xs">${r.done ? 'finished' : 'testing'} (${r.attempts} ${r.attempts === 1 ? 'attempt' : 'attempts'})</span>
     </div>`).join('');
}
```

- [ ] **Step 4: Write the finish path**

Add after `ntDebugRunAgain`:

```js
function ntDebugRosterRows() {
  return Array.from({ length: ntPlayerCount }, (_, i) => ({
    name:     ntPlayerNames[i] || ('ADMIN-' + (i + 1)),
    done:     !!ntDebugFinished[i],
    attempts: ntDebugAttemptCounts[i] || 0,
  }));
}

function ntDebugBroadcastRoster(authoring) {
  mpSendEnvelope({
    type: 'SYNC',
    payload: {
      action:    'NT_DEBUG_ROSTER',
      finished:  ntDebugFinished.slice(),
      attempts:  ntDebugAttemptCounts.slice(),
      authoring: !!authoring,
    },
  });
}

// Finish is FINAL — there is no un-finishing. Per mode:
//   Solo — straight through; no gate exists.
//   PTP  — sequential handover, so no simultaneous-finish problem exists at all.
//   MDLM — one slot in ntDebugFinished; the host resolves on .every(Boolean).
function ntDebugFinish() {
  const ov = document.getElementById('nt-debug-retry-overlay');
  if (ov) ov.style.display = 'none';
  ntStopPlayback();
  const best   = ntDebugBest ? ntDebugBest.placements.slice() : [];
  const bestMs = ntDebugBest ? ntDebugBest.latencyMs : 0;
  const waiting = 'Testing complete — waiting for the other analysts…';

  if (window.syllyMultiplayerMode === 'client') {
    // Fire-and-forget, matching ntCommit's client path: a residual sync lock would silently
    // drop this ACTION and strand the round, and Finish is already one-shot by construction.
    mpSendEnvelope({
      type: 'ACTION',
      payload: {
        action:         'NT_DEBUG_FINISH',
        bestPlacements: best,
        bestLatencyMs:  bestMs,
        attempts:       ntDebugMyAttempt,
      },
    });
    ntDebugFinished[mpMyPlayerIdx]      = true;   // local optimism, for this device's roster
    ntDebugAttemptCounts[mpMyPlayerIdx] = ntDebugMyAttempt;
    ntShowStandby(waiting, ntDebugRosterRows());
    return;
  }

  if (window.syllyMultiplayerMode === 'host') {
    // Host marks its OWN slot directly and never self-sends — the dedup guard drops every
    // envelope where originId === syllyDeviceUid (NT's own BUG-05, and logic-engine.md
    // generalises it to any phase where the host is a submitting participant).
    ntDebugFinished[mpMyPlayerIdx]      = true;
    ntDebugAttemptCounts[mpMyPlayerIdx] = ntDebugMyAttempt;
    ntPtpPlacements[mpMyPlayerIdx]      = best;
    ntDebugBroadcastRoster(false);
    if (ntDebugFinished.every(Boolean)) ntResolveCycleMdlm(ntPtpPlacements.slice());
    else ntShowStandby(waiting, ntDebugRosterRows());
    return;
  }

  // Solo / PTP — the handover gate already serialises this.
  ntPtpTimelines[ntPtpTurn]       = ntDebugBest ? ntDebugBest.timeline : ntComputeTimeline_local();
  ntPtpPlacements[ntPtpTurn]      = best;
  ntDebugAttemptCounts[ntPtpTurn] = ntDebugMyAttempt;
  ntPtpTurn++;
  if (ntPtpTurn < ntPlayerCount) {
    ntMyPlacements = []; ntFirewallUsed = 0; ntHoneypotUsed = 0;
    ntDebugMyAttempt = 0;
    ntDebugBest      = null;
    ntBeginPtpTurn();
  } else {
    ntResolveCyclePtp();
    if (ntPlayerCount > 1) ntShowGatherGate();
    else ntShowComparisonPlayback();
  }
}
```

- [ ] **Step 5: Add the two packet handlers**

In `ntHandleEnvelope`'s ACTION block, after the `NT_COMMIT` handler (line 3181):

```js
    if (payload.action === 'NT_DEBUG_FINISH') {
      const senderIdx = mpPlayerSlots.findIndex(p => p.uid === envelope.originId);
      if (senderIdx === -1) return;
      // `|| []` is LOAD-BEARING here, not defensive habit. Finishing with an empty build is
      // NORMAL in a sandbox ("what's the baseline with no hardening at all?"), and Firebase
      // deletes an empty array in flight — so the host reads undefined, ntResolveCycleMdlm maps
      // over it and throws, and the whole room is stranded.
      ntDebugFinished[senderIdx]      = true;
      ntDebugAttemptCounts[senderIdx] = payload.attempts || 0;
      ntPtpPlacements[senderIdx]      = payload.bestPlacements || [];
      mpUnlockSync();
      ntDebugBroadcastRoster(false);
      if (ntDebugFinished.every(Boolean)) ntResolveCycleMdlm(ntPtpPlacements.slice());
      return;
    }
```

In the SYNC block, after the `NT_GENERATE` handler:

```js
    if (payload.action === 'NT_DEBUG_ROSTER') {
      ntDebugFinished      = payload.finished || [];
      ntDebugAttemptCounts = payload.attempts || [];
      if (payload.authoring) {
        // The host has looped back to the Node Editor — return to the same standby this device
        // saw at the start, and re-zero every piece of Debug session state.
        ntDebugMyAttempt = 0;
        ntDebugBest      = null;
        ntMyPlacements   = [];
        ntFirewallUsed   = 0;
        ntHoneypotUsed   = 0;
        ntShowStandby('Authoring node…');
        return;
      }
      // Repaint in place — a player still building must NOT be navigated to standby by a
      // roster update, so this deliberately does not call ntShowStandby.
      ntRenderDebugRoster(ntDebugRosterRows());
      return;
    }
```

- [ ] **Step 6: Wire the Finish button**

```js
  document.getElementById('btn-nt-debug-finish').addEventListener('click', () => { playLaunch(); ntDebugFinish(); });
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
node --check js/games/nt.js && node tools/verify-nt-loopback.js
```

- [ ] **Step 8: Prove the two high-severity checks fail first**

```bash
# (a) the vacuous gate — revert the sizing to []
sed 's/ntDebugFinished      = new Array(ntPlayerCount).fill(false);/ntDebugFinished      = [];/' \
  js/games/nt.js > /tmp/nt-revert/nt-gate.js
NT_SRC=/tmp/nt-revert/nt-gate.js node tools/verify-nt-loopback.js
#   expect FAIL on "the round has NOT resolved on one Finish"

# (b) the empty-best erasure — revert the || [] guard
sed 's/ntPtpPlacements\[senderIdx\]      = payload.bestPlacements || \[\];/ntPtpPlacements[senderIdx]      = payload.bestPlacements;/' \
  js/games/nt.js > /tmp/nt-revert/nt-best.js
NT_SRC=/tmp/nt-revert/nt-best.js node tools/verify-nt-loopback.js
#   expect FAIL on "kept an ARRAY for their empty best build" / "no exceptions anywhere"
```

If either passes, the check is not testing what it claims. Fix the check.

- [ ] **Step 9: Sweep seeds and commit**

```bash
for s in 1 2 3 4 5 6 7 8; do NT_SEED=$s node tools/verify-nt-loopback.js | tail -3; done
git add js/games/nt.js tools/verify-nt-loopback.js
git commit -m "feat(nt): Finish, the per-player readiness gate, and the standby roster

The one genuinely new readiness shape in the feature: players finish at different
times. Two new packets — NT_DEBUG_FINISH (ACTION) and NT_DEBUG_ROSTER (SYNC).
The host marks its own slot directly and never self-sends, since the dedup guard
drops originId === syllyDeviceUid.

payload.bestPlacements || [] is load-bearing rather than habitual: finishing with
an empty build is normal in a sandbox, Firebase deletes empty arrays in flight,
and without the guard ntResolveCycleMdlm maps over undefined and strands the room.

ntShowStandby now takes (msg, roster) and paints both elements on every path;
existing single-argument callers explicitly blank the roster with no edits.

Both high-severity checks proven to fail against reverted copies via NT_SRC=.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 9: The summary — best-of-N caption and the Author New Node loop-back

**Files:**
- Modify: `js/games/nt.js` — `ntRenderSummary` (1823), `ntShowSummary` (1391), `ntShowAuthoring` (Task 5), `ntResetState` (3360)
- Test: `tools/verify-nt-loopback.js`

**Interfaces:**
- Consumes: `ntDebugAttemptCounts` (Task 2), `ntShowAuthoring` (Task 5), `ntDebugBroadcastRoster` (Task 8)
- Produces: nothing new — modifies existing functions only

- [ ] **Step 1: Write the failing test**

```js
// ── Summary: best of N, and the loop back to the editor ───────────────────────
section('Summary — scored on best attempts, then a fresh sandbox');
(() => {
  const r = makeRoom(['Ali', 'Bec']);
  seatAll(r, { win: 90, debug: true });
  r.host.__nt.showAuthoring();
  r.host.__nt.authRandTerrain();
  r.host.__nt.bumpFw(10);
  r.host.__nt.deploy();
  r.all.forEach(drain);

  // The host builds well, then deliberately throws away its last attempt.
  r.host.__nt.showBuild();
  r.host.__nt.setPlacements([{ ax: 4, ay: 4, type: 'firewall' }, { ax: 8, ay: 8, type: 'firewall' }]);
  r.host.__nt.commit();
  const good = r.host.__nt.debugBest;
  r.host.__nt.runAgain();
  r.host.__nt.setPlacements([]);
  r.host.__nt.commit();
  check('best survives a deliberately worse final attempt', r.host.__nt.debugBest, good);

  r.clients[0].__nt.showBuild(); r.clients[0].__nt.commit();
  r.host.__nt.finish();
  r.clients[0].__nt.finish();
  r.all.forEach(drain);

  r.host.__nt.showSummary('match');
  check('the summary is captioned with the attempt count',
        /best of 2 attempts/.test(r.host.__nt.text('nt-summary-caption')), true);
  check('…and the caption is visible', r.host.__nt.shown('nt-summary-caption'), true);
  check('the host is offered a fresh sandbox',
        r.host.__nt.summaryBtnText(), 'Author New Node');

  // The loop-back is symmetric with the opening: one entry point, reached twice.
  r.host.__nt.tapSummary();
  r.all.forEach(drain);
  check('host returns to the editor',       lastScreen(r.host), 'screen-nt-authoring');
  check('…on a genuinely blank board',
        [r.host.__nt.node.badSectors.length, r.host.__nt.node.nativeHoneypots.length], [0, 0]);
  check('client returns to the same standby it saw at the start',
        lastScreen(r.clients[0]), 'screen-nt-standby');
  check('…with its Debug state re-zeroed',
        [r.clients[0].__nt.debugAttempt, r.clients[0].__nt.debugBest], [0, null]);
  check('no exceptions', r.all.map(errs), [[], []]);
})();

// ── ntResetState ──────────────────────────────────────────────────────────────
section('Teardown — session state clears, the SETTING survives');
(() => {
  const d = makeDevice('reset', 'single', 0, [{ uid: 'u0', nickname: 'Ali' }]);
  d.__nt.seat({ players: 1, names: ['Ali'], debug: true });
  d.__nt.showAuthoring();
  d.__nt.authRandTerrain();
  d.__nt.deploy();
  d.__nt.showBuild();
  d.__nt.commit();
  check('mid-session state exists', d.__nt.debugAttempt, 1);

  d.__nt.resetState();
  check('attempt count cleared',   d.__nt.debugAttempt, 0);
  check('best cleared',            d.__nt.debugBest, null);
  check('readiness arrays cleared',[d.__nt.debugFinished, d.__nt.debugCounts], [[], []]);
  check('brush back to default',   d.__nt.debugBrush, 'bad');
  check('but ntDebugMode SURVIVES — it is a setting, like every other setting',
        d.__nt.debugMode, true);
  check('no exceptions', errs(d), []);
})();
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node tools/verify-nt-loopback.js
```

Expected: FAIL — the caption is empty and the summary button reads `Next Cycle ▶`.

- [ ] **Step 3: Add the caption to `ntRenderSummary`**

Insert at the **top** of `ntRenderSummary` (after the `isFinal` line, line 1828), before any of
the three branches — so every path sets it, per the multi-renderer rule:

```js
  // Set on EVERY path, including the non-Debug ones, so a Debug session followed by a Standard
  // one cannot leave a stale caption behind (ui-style.md, the Stack's multi-renderer rule).
  const capEl = document.getElementById('nt-summary-caption');
  if (capEl) {
    if (ntDebugMode) {
      const seat = window.syllyMultiplayerMode === 'single' ? 0 : mpMyPlayerIdx;
      const n = ntDebugAttemptCounts[seat] || ntDebugMyAttempt || 1;
      capEl.textContent   = `STAGING — scored on your best of ${n} attempt${n === 1 ? '' : 's'}`;
      capEl.style.display = '';
    } else {
      capEl.textContent   = '';
      capEl.style.display = 'none';
    }
  }
```

- [ ] **Step 4: Make the summary terminal in Debug**

In `ntShowSummary`, insert directly after the `isFinalMatch` line (line 1398):

```js
  // Debug is single-node and terminal: there is no next cycle, no rolling average and no
  // match-wide ranking. The host's onward action is a fresh sandbox instead.
  if (ntDebugMode) {
    if (heading)  heading.textContent = 'Diagnostic Summary // STAGING';
    if (logsBtn)  logsBtn.style.display = 'none';
    if (rebootBtn) rebootBtn.style.display = 'block';
    if (nextBtn) {
      const canAuthor = window.syllyMultiplayerMode !== 'client';
      nextBtn.style.display = canAuthor ? 'block' : 'none';
      nextBtn.textContent   = 'Author New Node';
      nextBtn.disabled      = false;
    }
    ntSummaryCallback = () => ntShowAuthoring();
    showScreen('screen-nt-summary');
    ntRenderSummary();
    return;
  }
```

All four elements this block touches (`heading`, `nextBtn`, `rebootBtn`, `logsBtn`) are already
declared at lines 1394–1397, above the insertion point. Nothing needs moving.

- [ ] **Step 5: Announce the loop-back to clients**

In `ntShowAuthoring` (Task 5), add the broadcast immediately before `showScreen`:

```js
  // Symmetric with the opening: every other device returns to the same standby it saw at the
  // start. One authoring entry point, reached twice — not a second "restart" path. This is why
  // NT_DEBUG_ROSTER carries an `authoring` flag rather than the feature minting a third packet.
  if (window.syllyMultiplayerMode === 'host') ntDebugBroadcastRoster(true);
  showScreen('screen-nt-authoring');
```

> `ntDebugBroadcastRoster` sends `finished: []` and `attempts: []`, both of which Firebase
> erases in flight. That is harmless and intended: the applier reads them through `|| []`, and
> when `authoring` is set it discards them anyway.

- [ ] **Step 6: Extend `ntResetState`**

In `js/games/nt.js`, add to `ntResetState` (after `ntGhostAnchor = null;`, line 3411):

```js
  // Debug / Sandbox session state. ntDebugMode is deliberately NOT cleared — it is a setting,
  // and every other setting survives a play-again / Reboot too.
  ntDebugBrush         = 'bad';
  ntDebugMyAttempt     = 0;
  ntDebugBest          = null;
  ntDebugFinished      = [];
  ntDebugAttemptCounts = [];
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
node --check js/games/nt.js && node tools/verify-nt-loopback.js
for s in 1 2 3 4 5 6 7 8; do NT_SEED=$s node tools/verify-nt-loopback.js | tail -3; done
```

Expected: every check green on every seed, and the 146 originals untouched.

- [ ] **Step 8: Commit**

```bash
git add js/games/nt.js tools/verify-nt-loopback.js
git commit -m "feat(nt): best-of-N summary caption and the Author New Node loop-back

The summary is terminal in Debug — single node, no cycle counter, no rolling
average — and captions itself with the attempt count. The caption is written on
every ntRenderSummary path including the non-Debug ones, so a Debug session
followed by a Standard one cannot leave a stale line behind.

Author New Node reuses ntShowAuthoring rather than adding a restart path, and
tells the other devices via an `authoring` flag on NT_DEBUG_ROSTER — the packet
count in the design spec is unchanged; one packet gains one field.

ntResetState clears the five session variables and deliberately leaves
ntDebugMode alone: it is a setting, and settings survive a Reboot.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 10: Layout check, documentation pass, and the SW bump

The feature is functionally complete after Task 9. This task closes it out per `CLAUDE.md`'s
Documentation Integrity Protocol — **no phase snapshot may be written until every item here is
done.**

**Files:**
- Modify: `sw.js` — `CACHE_NAME`
- Modify: `docs/code-map.md`, `docs/rules/game-identities.md`, `CLAUDE.md`, `.claude/rules/ui-style.md`, `docs/implementation-notes/nt-implementation-notes.md`, `docs/decision-log.md`, `index.html` (How to Play card)

**Interfaces:**
- Consumes: everything above
- Produces: nothing (documentation and release only)

- [ ] **Step 1: Run the layout check**

`screen-nt-authoring` is the most crowded single screen in NT — a grid, a four-pill brush row, a
hint line, two steppers, two secondary buttons and a CTA. No `verify-*.js` harness can see
spacing, alignment or overflow, because a mock element has no box.

Invoke the **`visual-check`** skill on `screen-nt-authoring` at all three Matrix Scale settings
(16, 18, 20). Assert with `getBoundingClientRect`:

- `Deploy Node` is fully within the viewport at **20×20** on a small phone (this is risk-register item 4)
- the page body does **not** scroll horizontally
- every button clears 44 px in both dimensions
- the brush pill row does not wrap awkwardly at the narrowest width

If there is vertical headroom at 20×20, raise the two Randomise buttons to
`min-h-14 … text-base` for strict DD-31 conformance (see the flag in Task 4, Step 1).

Also check `nt-debug-retry-overlay` renders as a Decision Modal with both buttons at
`min-h-14`, and `screen-nt-standby` with a full four-player roster.

- [ ] **Step 2: Add the How to Play card**

In `index.html`, insert into `nt-how-to-overlay` immediately **before** the `✨ Sylly Mode` card
(before line 7696). Debug sits directly above Sylly here too, mirroring the settings order — the
same sanctioned exception. It is a **card, not a tab**: Debug is a mode, not reference content.

```html
        <div class="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-emerald-600">Debug Mode</p>
          <p class="font-bold text-stone-800">Staging Environment</p>
          <p class="text-stone-500 text-sm">One analyst authors the Node by hand in the <span class="font-semibold text-stone-700">Node Editor</span> — drawing Bad Sectors, dropping Native Honeypots, placing the ports and setting everyone's budget. Once it is deployed, you can re-run your trace <span class="font-semibold text-stone-700">as many times as you like</span>; only your best attempt is scored. Not available alongside Sylly Mode.</p>
        </div>
```

- [ ] **Step 3: Bump the Service Worker**

In `sw.js`, bump `CACHE_NAME` from `'sylly-games-v197'` to `'sylly-games-v198'`.

No `PRECACHE_URLS` change is needed — this feature adds no new files.

- [ ] **Step 4: `docs/code-map.md`**

Add to the NT section:
- Screen `screen-nt-authoring` (and its child ids)
- Overlay `nt-debug-retry-overlay`
- State: `ntDebugMode`, `ntDebugBrush`, `ntDebugMyAttempt`, `ntDebugBest`, `ntDebugFinished`, `ntDebugAttemptCounts`
- Functions: `ntEffectiveHardeningWin`, `ntSetCardDisabled`, `ntDrawPortMarker`, `ntAuthBlankNode`, `ntShowAuthoring`, `ntRenderAuthGrid`, `ntAuthTap`, `ntAuthPlaceTerrain`, `ntAuthRemoveTerrain`, `ntAuthSetPort`, `ntSyncAuthUI`, `ntAuthMaxFirewall`, `ntAuthMaxHoneypot`, `ntAuthRandomiseTerrain`, `ntAuthRandomiseBudget`, `ntDeployNode`, `ntDebugRunAttempt`, `ntDebugOpenRetry`, `ntDebugRunAgain`, `ntDebugRosterRows`, `ntDebugBroadcastRoster`, `ntDebugFinish`, `ntRenderDebugRoster`
- The changed signature: `ntShowStandby(msg, roster)`

**Grep for the NT section, then offset-read. Never read `code-map.md` whole — it is ~132 KB.**

- [ ] **Step 5: `docs/rules/game-identities.md` § Game 13**

- Settings table: add the `ntDebugMode` row (Debug Mode / ON–OFF / OFF), placed directly above `✨ Sylly Mode`
- Screens table: `screen-nt-authoring`
- Overlay Types table: `nt-debug-retry-overlay`
- Multiplayer packets: `NT_DEBUG_FINISH` (ACTION client→host) and `NT_DEBUG_ROSTER` (SYNC host→all, carries the `authoring` flag); note that `NT_GENERATE` carries an authored node in Debug and gains a `debug: true` field
- Terminology: **Debug Mode** (Staging Environment), **Node Editor**, **Deploy Node**, **Attempt**, **Best Trace**

- [ ] **Step 6: `.claude/rules/ui-style.md`**

Add the new pattern to § Settings Layout Standard. Two named behaviours:

| Pattern | Behaviour |
|---------|-----------|
| **Mutually exclusive** | A ON forces B OFF, reciprocally. Both stay reachable. |
| **Superseded** | A ON makes B irrelevant. **B's stored value is not modified** and returns intact when A goes OFF. |

The visual contract: controls get `opacity-50 pointer-events-none`; the card **title stays at full
contrast**; a reason line is **mandatory** at `text-amber-600 text-xs` directly under the controls.
Amber, never `text-stone-400` — stone-400 is already the dynamic-value-line colour (what you have
*picked*); amber means *unavailable*, and the two must not look alike.

Also record the sanctioned exception: an exclusivity partner may sit immediately above the
`✨ Sylly Mode` card, in both the settings overlay and the How to Play overlay. Nothing else may.

Note that NT implements this locally (`ntSetCardDisabled`) and that a shared
`bindExclusiveSettings()` engine helper waits on instance two — the project's own precedent
(dice logic stays in `dyb.js` until a second dice game appears).

- [ ] **Step 7: `docs/implementation-notes/nt-implementation-notes.md`**

Add a design-decision entry covering:
- The core finding: an authored node is shape-identical to `ntGenerateNode()`'s output, which is why the feature needed only two new packets and left `ntRenderBuildGrid` byte-identical
- Why a new screen beat parameterising `ntRenderBuildGrid` — its pointer handlers are saturated with build semantics, and a mode branch would have put conditional logic on the one render path the loopback harness actually executes
- **The spec's inverted "best" (correction C1)** and how it was caught: NT scores the *longest* delay at 100% SER, so best is the highest latency, not the lowest. Worth its own paragraph — a reviewer reading the spec later will hit the same contradiction.
- **The settings-sync omission (correction C2)** — `ntDebugMode` is a setting, and a spec that lists settings wiring must include the `SETTINGS_SYNC` payload in both directions. A general lesson for the next mode-flag feature.
- The `ntResolveGuard` hazard being fixed for free by the accessor, because `ntStartBuildTimer` early-returns before arming it
- The button-id naming constraint on the retry overlay, and why it is a total-but-invisible failure

- [ ] **Step 8: `docs/decision-log.md`**

One entry, newest on top, ~4 lines: the new suite-wide mutually-exclusive / superseded settings
pattern, its first instance (NT Debug ↔ Sylly), the deliberate decision to implement it locally
until instance two, and a pointer to `ui-style.md` § Settings Layout Standard.

- [ ] **Step 9: `CLAUDE.md`**

- Bump the SW version pointer to **v198** in § Current Focus
- Compress the outgoing v196–197 entry to one line and move its detail to `docs/sw-changelog.md`
- Add the v198 entry
- Update the § Verification harnesses table: NT's check count rises from 146 to its new total

- [ ] **Step 10: Final verification**

```bash
node --check js/games/nt.js && node --check js/engine.js && node --check js/engine-multiplayer.js
node tools/verify-nt-loopback.js
for s in 1 2 3 4 5 6 7 8; do NT_SEED=$s node tools/verify-nt-loopback.js | tail -3; done
grep -n "CACHE_NAME" sw.js          # expect sylly-games-v198
grep -c "ntComponentDensity" docs/rules/game-identities.md   # expect 0
```

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "docs(nt): Debug Mode documentation pass + SW v198

Closes the Documentation Integrity Protocol for the feature: code-map,
game-identities § Game 13, ui-style.md's new mutually-exclusive/superseded
settings pattern, nt-implementation-notes, decision-log and CLAUDE.md, plus a
How to Play card and the CACHE_NAME bump.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## What "done" looks like

Cross-checked against spec § 15:

- [ ] Debug Mode toggles in settings, mutually exclusive with Sylly, superseding Iterations and Hardening Window, each with its amber reason line *(Task 2)*
- [ ] A node can be authored from blank, or randomised then edited, and deployed *(Tasks 4–6)*
- [ ] Every player can retry without limit, sees their latency and best-delta after each attempt, and finishes when they choose *(Tasks 7–8)*
- [ ] The summary scores best attempts, captioned "best of N attempts" *(Task 9)*
- [ ] Works in solo, PTP and MDLM *(Task 6 routes all three; Task 8 branches per mode)*
- [ ] `verify-nt-loopback.js` green — 146 existing checks plus the new Debug scenarios — across eight seeds, with the three high-severity new checks proven to fail on reverted copies *(Tasks 6 Step 8, 8 Step 8)*
- [ ] All seven documentation targets in spec § 13 updated, and § 13.1's drift corrected *(Tasks 1 and 10)*

**Still not covered by any of this, and worth saying out loud:** a real **3-device MDLM session**.
No harness has clock skew, Firebase ordering, dropped packets, or any judgement about how the
retry loop *feels*. NT's own BUG-15/16 are the standing reminder that a host-side playtest is
clean by construction — **the host never round-trips its own state**, so testing Debug Mode
solely as the host proves nothing about what the clients see.
