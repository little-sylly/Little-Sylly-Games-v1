---
name: visual-check
description: Render any game screen in a real headless browser to check layout, measure geometry, or view a per-device (per-seat) screen. Use when a screen "looks off", when verifying a presentational fix, or when a bug is about position/size/spacing/alignment rather than rules or packets. Covers the blind spot every tools/verify-*.js harness shares — none of them do layout.
---

# Visual Check — driving a game screen in a real browser

The `tools/verify-*.js` harnesses cover rules, packets, decks and appliers. **None of them
do layout.** The three `'single'`-mode ones use `getElementById: () => null` so no render
code runs at all; `verify-cjar-loopback.js` executes render against mock elements, but a
mock element has no box — it cannot tell you two things are 20 px apart when they should
be 4.

This skill is that fourth tier: **real Chromium, real CSS, real geometry.**

| Tier | Tool | Catches |
|------|------|---------|
| Rules / data | `verify-[abbr]-deck/loop/dd.js` | bad decks, bad arithmetic, bad state |
| Packets + render-executes | `verify-cjar-loopback.js` | absent payload fields, host/client divergence, render throws |
| **Layout + per-device view** | **this skill** | **spacing, alignment, overflow, what seat N actually sees** |
| Feel | a real multi-device session | pacing, thumb reach, real network — *not replaceable* |

---

## 1. Serve the app

```powershell
$p = Start-Process -FilePath "C:\Program Files\nodejs\npx.cmd" `
  -ArgumentList "--yes","http-server",".","-p","8791","-s" `
  -PassThru -WindowStyle Hidden `
  -RedirectStandardOutput "$env:TEMP\hs_out.log" -RedirectStandardError "$env:TEMP\hs_err.log"
Start-Sleep -Seconds 8
(Invoke-WebRequest -Uri "http://localhost:8791/index.html" -UseBasicParsing).StatusCode
```

- **`python -m http.server` does not work on this machine** — `python` is the Windows Store
  alias stub and exits immediately with "Python was not found".
- **`Start-Process -FilePath npx` fails** with `%1 is not a valid Win32 application` — it
  resolves to `npx.ps1`. Use the full path to **`npx.cmd`**.
- First run takes ~8 s while npx fetches `http-server`. Poll for the 200; don't assume.
- Verify with **PowerShell `Invoke-WebRequest`** — `curl` via the Bash tool returns nothing
  here. Node/Playwright reach the server from Bash fine; it's only `curl` that doesn't.

**Stop it when done:**
```powershell
Get-NetTCPConnection -LocalPort 8791 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
```

## 2. Get Playwright — a stable dir outside the project

The project bans `npm` and build tooling (CLAUDE.md § Anti-Patterns). That rule is about
the **shipped app** — Node itself is already standard here (every `tools/verify-*.js` runs
on it). This respects the rule by keeping Playwright entirely outside the repo: no
`package.json`, no `node_modules`, nothing new served by GitHub Pages.

Install **once per machine** to a fixed location — *not* the session scratchpad, which is
session-specific and would make you reinstall every time:

```bash
STABLE="$HOME/.claude-tooling/playwright"
mkdir -p "$STABLE" && cd "$STABLE"
[ -f package.json ] || npm init -y
npm install playwright
npx playwright install chromium
```

Then run drivers from the repo root with `NODE_PATH` pointed at it:

```bash
cd "d:/Coding Projects/Little-Sylly-Games"
NODE_PATH="$HOME/.claude-tooling/playwright/node_modules" node "$SCRATCH/shot.js"
```

**Cost, measured:** the npm package is 19 MB and installs in ~3 s (once, not per session).
The Chromium binary is 703 MB but lives in a **machine-wide** cache
(`AppData/Local/ms-playwright`) shared by every project — re-running
`playwright install chromium` when it's present is a no-op, nothing re-downloads. All of it
is free; there is no service, API or account involved.

Write throwaway driver scripts to the **session scratchpad**, not the repo root — only the
*install* wants a stable home.

## 3. Reach the screen — seed state, don't play the game

Most games (all MDLM-only ones — CJAR, PKO, FLW…) have **no single-device path**. You
cannot click to a mid-match screen. Assign the game's globals directly and call its own
render functions, then `showScreen`. This is a debug harness, not a test — it asserts
nothing about rules.

```js
await page.evaluate(async () => {
  await cjarLoadData();               // REQUIRED — returns a promise; renders throw on null CJAR_DATA
  window.playClashWin = () => {};     // stub audio

  window.syllyMultiplayerMode = 'host';   // window.* — these ARE window props
  mpMyPlayerIdx = 0;                      // BARE — see the trap below

  cjarPlayerNames = ['Sylvia','Max','Ruby','Theo'];
  cjarPlayerCount = 4;
  cjarStashes     = [12,30,5,18];
  /* …the rest of the game's state… */

  cjarRenderStage();                  // the game's real renderers
  cjarRenderRevealRows();
  showScreen('screen-cjar-table');
});
```

### ⚠ The trap that will silently ruin your screenshots

`mpMyPlayerIdx`, `mpPlayerSlots`, `mpActiveGame` (etc.) are **top-level `let` bindings, not
window properties** — `logic-engine.md` § `window.` prefix rule, the cause of BLD Bug 8.
Writing `window.mpMyPlayerIdx = 0` creates a *different* property; the real binding stays
at its default `-1`, so **no seat is "me"**. Every per-seat behaviour then renders wrong
and looks plausible: the "me" row loses its tint, and Open Book hides *your own* numbers.

Assign it **bare**: `mpMyPlayerIdx = 0`. Split by declaration type —
`window.syllyMultiplayerMode` / `window.syllySyncLocked` / `window.mpLobbyStyle` take the
prefix; the `let`-declared ones must not.

## 4. Measure, don't just look

The screenshot tells you *something* is off; `getBoundingClientRect` tells you *what*.
This is what found DD-32's score-table gap (20 px between a header and its own rows, where
row-to-row was 6 px — the Stack's `gap-4` leaking between two sibling zones):

```js
const g = await page.evaluate(() => {
  const h    = document.getElementById('cjar-reveal-header').getBoundingClientRect();
  const rows = [...document.getElementById('cjar-reveal-rows').children]
                 .map(x => x.getBoundingClientRect());
  const heads = [...document.getElementById('cjar-stage-row').previousElementSibling.children]
                 .map(e => Math.round(e.getBoundingClientRect().top));
  return {
    headerToFirstRow: Math.round(rows[0].top - h.bottom),
    rowToRow:         Math.round(rows[1].top - rows[0].bottom),
    headingsAligned:  new Set(heads).size === 1,          // all columns on one row?
    bodyScrollsSideways: document.documentElement.scrollWidth >
                         document.documentElement.clientWidth,   // must be false
  };
});
```

Good habits: assert `bodyScrollsSideways === false` on any screen with a table or card row,
and compare a suspect gap against a known-good one on the same screen rather than judging
it in isolation.

## 5. Two devices = two browser contexts

A separate `browser.newContext()` per seat gives each its own storage and JS realm — a
genuine second device for everything except the network. Seed each with a different
`mpMyPlayerIdx` and their views **should legitimately differ**; that divergence is the
thing worth checking.

```js
for (const seat of [0, 1]) {
  const ctx  = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log(`seat${seat} THREW:`, e.message));
  await page.goto('http://localhost:8791/index.html', { waitUntil: 'networkidle' });
  await page.evaluate(seedFor(seat));            // mpMyPlayerIdx = seat
  await page.screenshot({ path: `seat${seat}.png` });
  await ctx.close();
}
```

Verified example — Open Book off, seat 0 = Sylvia, seat 1 = Max:

```
seat 0 →  Sylvia: 12 stashed  ·  Max/Ruby/Theo: ••• stashed
seat 1 →  Max:    30 stashed  ·  Sylvia/Ruby/Theo: ••• stashed
```

**Always attach `page.on('pageerror')`.** A render throw inside a SYNC applier escapes
through `mpHandleEnvelope` and strands that device on the previous screen — CJAR BUG-06,
which survived 222 green harness checks. Here it prints.

## 6. Clean up

- Screenshots land in the **CWD** — delete them from the repo root, or write them to the
  scratchpad. Never commit them.
- Delete any `temp-*.js` driver you wrote at the repo root.
- Kill the server (§1).

---

## What this does NOT replace

Two contexts are two *renderers*, not two peers — they are seeded, not wired to each other.
So this cannot see:

- **Real Firebase** — event ordering, latency, dropped packets, the erase-empty-values rule.
  That is `verify-cjar-loopback.js`'s job (real wire, `CJAR_SRC=` to prove a test fails first).
- **Feel** — whether a beat is too fast, whether a target is thumb-reachable, whether text
  is readable at arm's length.
- **Real devices** — Chromium headless only; no real touch, no backgrounding, no other engines.

A real multi-device session is still the last word. This just means far fewer things reach it.
