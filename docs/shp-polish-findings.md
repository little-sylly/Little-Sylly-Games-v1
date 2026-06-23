# Counting Sheep (SHP) — UI Polish Findings
**Status:** Analysis only — no code touched. Owner to review + playtest before any changes land.
**Source files reviewed:** `js/games/shp.js`, `index.html` (SHP section), `css/styles.css` (SHP rules), `js/engine-multiplayer.js` (SHP entry).

---

## P1 — Gameplay Clarity (affects understanding / fairness)

### 1. Wolf trap has no visual indicator
**What:** The `shp-card-wolf` CSS class and the `opts.wolf` render path in `shpRenderCard` both exist but are never called in any render function. When a player draws a Big Bad Wolf (id 12), it's consumed on draw and shrinks their `shpHandCap` by 1. Their hand becomes smaller — but there is no visible "blocked slot" placeholder.

**Where it hurts:** A player in a 4-hand game suddenly has 3 cards with no explanation. In an MDLM game, other players can't even see the hand count confidently. The Wolf mechanic is invisible after triggering.

**Suggested fix:** In `shpHandFooter`, after rendering the real hand, add a greyed-out `shpRenderCard(null, { wolf: true })` placeholder for each active Wolf (`shpWolfActive[me]` is truthy). The CSS class is already styled and ready.

---

### 2. Two-card forced mode shows no illegal-pair feedback
**What:** When `shpForcedCards === 2` (after Heavy Eyelids or Sleep Paralysis nightmare), cards are rendered without the `opacity-40` dimming used in normal mode. A player can stage any two cards. If the staged pair busts the Herd, the host calls `shpHostPlayTwoCard` → `shpPostResolve` → `shpHostDeepSleep`. There is no pre-play warning.

**Note:** If no safe pair exists, `shpHasLegalLine` returns false and the player is auto-Deep-Slept on turn entry before they can pick — so you'll only reach two-card staging when at least one safe pair exists. But you may still accidentally pick a busting pair without knowing it.

**Suggested fix (light):** Keep all cards tappable (pair-level legality is hard to pre-show), but add a hint below the hand: "Select two that won't break 99 — a bad pair Deep Sleeps you." This sets the expectation without needing real-time pair validation.

**Suggested fix (thorough):** After the second card is staged (`shpTwoSel.length === 2`), check `shpPairFinalBest(me, a, b) > shpCeiling` and flash the "Play Both" button in red / add a `shpShake` animation + a warning text before committing. Still lets the player commit if they want to gamble.

---

### 3. How-to overlay doesn't mention the Big Bad Wolf
**What:** Step 2 ("Pillows & Alarms") lists: "Skip a Few, the Black Sheep (snaps to 99), Wide Awake and Heavy Eyelids." The Big Bad Wolf (id 12, `family:'trap'`) is entirely absent. It's a card that hits players silently on draw and has a lasting effect (shrunk hand cap). Players will encounter it and not understand what happened.

**Where:** `index.html` lines 7879–7883, Step 2 body text.

**Suggested fix:** Extend the Step 2 body to mention the Wolf: "The Big Bad Wolf hides in the Flock — if you draw one, it disappears but locks a slot in your hand forever." Or add a brief "Traps" sub-note at the end of Step 2. Alternatively, give Wolf its own short step before the "Winning and Scoring" card.

---

### 4. Dream Acceleration description is slightly misleading
**What:** Settings card body says: "Below 50, every number card counts double." The implementation in `shpHerdAfterCard` only doubles `kind:'add'` cards (Pasture: +1/+2/+5/+10). `kind:'random-add'` ("1, 2, Skip a Few…" and "Fogged Dream") is NOT accelerated — the `case 'random-add'` branch has no `shpDreamAccel` check.

**Where:** `index.html` line 7843 (settings body text). `shp.js` line 133 (code is correct; the description drifts).

**Suggested fix:** Change description to: "Below 50, every Pasture card counts double — Skip a Few and other specials aren't affected." or simply "Below 50, the +1/+2/+5/+10 Pasture cards count double."

---

## P2 — Immersion / Information Hierarchy (noticeable during play)

### 5. Status bar label doesn't respond to Plunge mode
**What:** The `shp-table-status` element (`text-indigo-400 text-xs font-semibold uppercase tracking-widest`) shows either `'Night'` or `'THE PLUNGE 🔻'`. The Herd number correctly turns `text-red-600` and the Plunge entry flash fires — but the label colour stays `text-indigo-400` throughout.

**Where:** `shp.js` line 486. The text is set but the element class isn't updated.

**Suggested fix:** In `shpRenderTable`, update `status.className` to swap in red text during the Plunge: e.g. `status.className = plunge ? 'text-red-500 text-xs font-semibold uppercase tracking-widest' : 'text-indigo-400 text-xs font-semibold uppercase tracking-widest';`

---

### 6. Ghost Lottery doesn't name the spend-holder for spectators
**What:** When the Nightmare Meter fills, spectators (non-spend-holder living players) see the banner: `'💤 A Sleepwalker is choosing a nightmare…'`. In a 5-player game with 2 Sleepwalkers, nobody knows which ghost is picking.

**Where:** `shp.js` line 554–555.

**Suggested fix:** Change to `'💤 ' + shpName(shpSpendHolder) + ' is picking a nightmare…'`. The `shpSpendHolder` index is already set and accessible at render time.

---

### 7. Nightmare Meter uses very small text
**What:** The meter dot row is `text-sm` and the "Nightmare Meter" label is `text-[10px] uppercase tracking-widest` — essentially invisible at a glance. The meter is the ghost system's key visual; it deserves better prominence.

**Where:** `shp.js` lines 534–539.

**Suggested fix:** Bump the label to `text-xs` and the dot row to `text-base` or `text-lg`. Or add a subtle card/pill background (`bg-violet-50 rounded-xl px-3 py-2`) to give it a container and visual weight.

---

### 8. Dream-shift banner has no visual container
**What:** The last-nightmare banner (`text-violet-700 text-sm text-center font-semibold`, prefixed `🌙 `) is plain text in the scroll body. It sits between the meter and the action-status line with no background or border. On a busy screen it blends in.

**Where:** `shp.js` lines 543–548.

**Suggested fix:** Wrap in a pill or card: e.g. `class="text-violet-700 text-sm text-center font-semibold bg-violet-50 border border-violet-200 rounded-xl px-3 py-2"`. This gives the disruption announcement a visible zone.

---

### 9. Plunge mode reminder text is very small
**What:** `'Numbers flip — drive the herd to 0.'` uses `text-[11px]` (below `text-xs` / 12px). It's the only instruction visible during the Plunge that tells players the objective has changed. Players in a rushed game may miss it entirely.

**Where:** `shp.js` line 507.

**Suggested fix:** Bump to `text-xs font-semibold` and consider making it `text-red-600` to match the crimson re-skin.

---

## P3 — Minor Polish (low-priority, mostly copy/cosmetic)

### 10. No Night number in the status bar
**What:** The status bar shows "Night" with no count. After several Deep Sleeps and redeals, players have no sense of session progress. Not strictly necessary for a survival game (you survive or you don't), but Night 1 / Night 3 / Night 7 gives a shared reference point for storytelling.

**Suggested fix:** Track a `shpNightNum` counter (increment in `shpDealNight`). Display `'Night ' + shpNightNum` instead of just `'Night'`.

---

### 11. Moon display may overflow player chips at 7 moons
**What:** Chips render moons as `'\u{1F319}'.repeat(shpLives[i])`. At 7 moons (setting max) that's seven emoji in a chip. The chip has no explicit width cap — at 7 moons the `text-sm leading-tight` moon row may overflow or push the chip wider than others.

**Where:** `shp.js` lines 519–524.

**Suggested fix:** Cap the display at 5 visible + number, or show as `🌙×7`. For example: `shpLives[i] <= 5 ? '\u{1F319}'.repeat(shpLives[i]) : '\u{1F319}×' + shpLives[i]`.

---

### 12. Gameover rankings have no sub-label for non-winners
**What:** The winner row shows `'Last one awake'` on the right. Non-winner rows have an empty `<span class="text-xs opacity-80">`. The standings feel unfinished — "Knocked out Nth" or just "Out" would fill the gap.

**Where:** `shp.js` line 675–678 (`shpRenderGameover`).

**Suggested fix:** For `rank > 0`: right span text = `'Knocked out ' + (shpGameStandings.length - rank) + (shpGameStandings.length - rank === 1 ? 'st' : rank === 2 ? 'nd' : 'rd') + ' last'` — or simpler, just `'Out'` / `'Eliminated'`. Even a Moon count delta would be interesting: "Lost their last Moon Night 3."

---

### 13. Herd info line is dense on one row
**What:** `'ceiling ' + shpCeiling + (plunge ? ' 🔻 falling' : '') + (shpDirection < 0 ? ' · ↺ reversed' : '')` — in the Plunge with reversed direction this reads "ceiling 84 🔻 falling · ↺ reversed" on a single `text-xs` line.

**Suggested fix:** Split into two lines: `<p>ceiling {N}{plunge ? ' 🔻' : ''}</p><p>{direction < 0 ? '↺ reversed' : ''}</p>`. Keeps each piece readable.

---

### 14. Deep Sleep screen doesn't name the crash reason thematically
**What:** The crash reason shows either "Gambled and broke the fence" (busted) or "Nowhere left to play" (stuck). These are functional but a bit dry.

**Suggested suggestion:** "Gambled too high — the herd broke loose." / "No safe card to play — sleep claimed them." Small copy polish; completely optional.

---

## Checklist summary for playtest

Things worth specifically verifying in the browser:

- [ ] Wolf draw occurs and the hand silently shrinks — confirm it's at least noticeable
- [ ] Two-card mode (Heavy Eyelids / Sleep Paralysis nightmare): does the staging UX feel navigable?
- [ ] Plunge entry flash is visible and clear enough before it self-clears
- [ ] Nightmare Meter dots are readable on a real phone screen
- [ ] Dream-shift banner is noticeable after a nightmare resolves
- [ ] 7-moon chip layout: does it wrap or overflow?
- [ ] How-to flow: does the Wolf absence cause real confusion on first encounter?
- [ ] "THE PLUNGE 🔻" status label at night: indigo on white — contrast ok?

---

## What's already solid (don't touch)

- Card design (64×88px, emoji + label) — legible and compact.
- Player chips — active player stands out clearly (indigo-600 vs white).
- Lottery UI (3 face-down backs + "Tap one to unleash it — blind.") — thematically on point.
- Deep Sleep screen — crash sound + 😴 + clear next-step CTA.
- Settings card descriptions — all accurate except Dream Acceleration (item 4 above).
- Quit overlay copy — "Tuck In?" / "Yeah, lights out." / "Stay awake!" — strong.
- Play-again overlay copy — "Another Night?" / "Fresh Flock, full Moons…" / "Count Again 🐑" — good.
- MDLM serialisation — all 5 settings covered; `getMinPlayers: 3` wired.
- `mpSerialiseSettings` coverage — confirmed complete.
