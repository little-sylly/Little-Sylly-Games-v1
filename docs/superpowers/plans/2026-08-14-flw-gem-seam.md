# Flawless — Gem Render Seam & Table Reference Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. Work one task per session where practical; every task ends at a committable state.

**Goal:** Move every piece of text and chrome out of FLW's gem artwork and into CSS, then spend that seam on the four things it unblocks — a readable round-end reveal, hold-to-gallery reference, always-visible gem effects at the table, and a discard strip.

**Architecture:** `flwRenderCard` becomes the single owner of a gem's appearance: a square art region inside a CSS display-case frame, with the carat on an overlaid placard and every interaction state (`dimmed` / `selected` / `selectable`) expressed as a class. Artwork drops to a plain square gem with no text and no border, so a rename or a reskin needs no new art. Everything downstream — gallery rows, hand placards, reveal cards, discard strip — renders through that one function.

**Tech Stack:** Vanilla ES6 globals, Tailwind (local `tailwind-play.js`), hand-written CSS, Node-based headless harnesses. No build step, no libraries.

**Spec:** `docs/new-game-tech-flw-gem-seam.md` — decisions D1–D11 in §2, task detail in §3–§10.

---

## Global Constraints

Every task's requirements implicitly include all of these.

- **No build tools.** No `npm`, no bundler, no new libraries. All symbols are globals; forward references work at runtime.
- **`index.html` is ~515 KB.** Never full-read it. **Never use the Edit tool for a multi-line block replacement in it** — past sessions have corrupted UTF-8 into mojibake that way. Use a Node script: `fs.readFileSync(p,'utf8')` → `String.prototype.replace` with a literal anchor → `fs.writeFileSync(p,out,'utf8')`, then verify with a targeted `grep`. This plan touches `index.html` in tasks 6, 7, 9 and 10 — all of them go through a script.
- **Australian English, metric units.** `colour`, `organise`, `recognise`.
- **FLW brand values:** rose-pink `#E879A8` (hover `#CF5A8D`), dark ink `#A02050`, Exhibition gold `#C9A227`, selection ring `#D6336C`, settings tint `bg-[#FBE0EA] hover:bg-[#F6C9DA] text-[#A02050]`, CTA class `flw-cta`, step label `flw-step-label`, modal border `border-[#F6C9DA]`.
- **`#A02050` is a separate hex from the brand, deliberately.** The owner intends to lighten `#E879A8` later; the carat ink must not follow it. Never derive one from the other.
- **Action Button Standard:** no emoji on any action button label; colour is brand, neutral stone, or semantic red only.
- **Motion Standard:** animate `transform` and `opacity` only. `ease-out` enter/exit, `ease-in-out` on-screen, never `ease-in`. 300 ms ceiling. The row-ping is a `box-shadow` **transition**, never an `animation` — the global reduced-motion block is duration-based and covers it for free. Do not add a second `prefers-reduced-motion` block.
- **The Stack** is the layout standard for every screen touched here. One column, no `my-auto`, no `h-screen`/`flex-1` split.
- **Tasks 1–10 ship against the EXISTING artwork.** Cards will look wrong mid-plan (baked-in text under a CSS placard). That is expected and is not a bug to chase — task 12 replaces the art.
- **After every task from 2 onward:**
  ```bash
  node tools/verify-flw-loopback.js
  ```
  and after task 4, also:
  ```bash
  node tools/verify-pko-chain.js && node tools/verify-pko-loop.js && node tools/verify-pko-events.js
  node tools/verify-shp-loop.js && node tools/verify-shp-loopback.js
  ```

---

## File Structure

| File | Responsibility | Touched by |
|------|----------------|------------|
| `css/styles.css` | `.flw-card*`, `.flw-carat`, `.flw-placard`, `.*-ref-row-ping` | 1, 5, 6, 7, 9 |
| `js/games/flw.js` | Seam, state, host loop, MP appliers, renderers | 1, 3, 5, 6, 7, 8, 9, 10 |
| `js/engine.js` | `bindCardHold`, `refHighlightRow` | 4 |
| `js/engine-multiplayer.js` | `flwLedgerMode` serialise + deserialise | 7 |
| `js/games/pko.js`, `js/games/shp.js` | Delegate to the shared helpers | 4 |
| `index.html` | Hand row, counterfeit row, ledger setting, how-to gem card, copy | 6, 7, 9, 10 |
| `tools/verify-flw-loopback.js` | New harness — wire + render-executing DOM | 2, and every task after |
| `sw.js` | `CACHE_NAME` → v183 | 12 |
| `docs/…` | code-map, game-identities, impl-notes, decision-log, CLAUDE.md | 13 |

---

## Task 1 — Render seam: square art, display-case frame, carat placard

**Spec:** §3. **Files:** `css/styles.css`, `js/games/flw.js`.

The root fix. `flwRenderCard`'s asset branch (`flw.js:127-133`) returns a bare background-image div — the carat and name elements are built **only** in the emoji fallback below it. That early return is upstream of five reported problems.

- [ ] Add the `.flw-card` CSS block to `css/styles.css`, near the other per-game card blocks. Copy the structure of `.cjar-card` (`styles.css:2006-2099`): a base class, three width-only size classes (`aspect-ratio: 1/1` supplies the height), state classes, and the placard.
  - Base: `position:relative; aspect-ratio:1/1; border-radius:0.6rem; overflow:hidden; background:#FBFAF7; border:2px solid #C9A227; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.6), 0 1px 4px rgba(0,0,0,0.18); background-size:cover; background-position:center; flex-shrink:0;`
  - Sizes: `.flw-card-sm{width:3rem}` `.flw-card-md{width:4.25rem}` `.flw-card-lg{width:5.5rem}`
  - States: `.flw-card-dim{opacity:.35}` `.flw-card-sel{outline:3px solid #D6336C; outline-offset:2px}`
  - Placard: `.flw-carat` — absolute top-left, `background:#F7F4EC; border:1px solid #C9A227; color:#A02050; font-weight:800`, with `sm`/`lg` descendant overrides for font-size and min-width.
  - Fallback: `.flw-card-fallback{background:var(--flw-gem,#ccc)}`
  - `.flw-card-back` — same frame, gradient fill.
- [ ] Rewrite `flwRenderCard(gemId, opts)` (`flw.js:108-148`) to the §3.4 shape. New `opts.size` (`'sm'|'md'|'lg'`, default `'md'`) and `opts.selected`.
  - **The placard is appended after the art/fallback branch, never inside it.** This is the fix — do not let either branch `return` early.
  - Face-down keeps its early return (a back has no placard).
  - Fallback face sets `--flw-gem` from `FLW_GEM[gemId].colour` and adds `.flw-card-fallback`. **No name element** — colour plus carat identifies a gem (spec D6).
  - Keep `el.dataset.gemId`.
- [ ] Update all five existing call sites to pass a size:
  - `flw.js:364` gallery row → `{ size: 'sm' }`
  - `flw.js:446` hand row → `{ size: 'md', selected: outlined }` and **delete** the caller's `card.style.outline = ...` line (`:447`)
  - `flw.js:908` Emerald overlay → `{ size: 'lg', selectable: true }`
  - `flw.js:1007` showing-result reveal → `{ size: 'md' }`
  - `flw.js:1409` Peek Guard → `{ size: 'lg' }`
- [ ] `flwRenderEmeraldSel` (`flw.js:916-921`) writes `c.style.outline` directly on children. Convert it to toggle `.flw-card-sel` so selection has exactly one implementation.
- [ ] `flwRenderCounterfeitToken` (`flw.js:463-468`) — give it the `.flw-card .flw-card-lg` frame so it matches the new cards. Keep its dashed-gold treatment as an override.

**Verification:** No harness yet. Load the app, enter FLW single-device, confirm: cards are square with a gold frame; the carat placard is legible on Raw Obsidian and Black Opal specifically; selection ring appears on tap; the Ruby lock still dims the other slot; the How-to → The Gems gallery renders at `sm` without clipping.

**Commit:** `feat(flw): square gem seam — CSS display-case frame + carat placard`

---

## Task 2 — Harness: `tools/verify-flw-loopback.js`

**Spec:** §11.1. **Files:** `tools/verify-flw-loopback.js` (new).

FLW has no harness at all. From here the plan adds a synced accumulator and moves render code that runs inside SYNC appliers — CJAR BUG-06's exact shape, where a client threw inside a render one line before `showScreen` and froze for a match while the host played on.

- [ ] Build on `tools/verify-cjar-loopback.js`. It is the model because it has the two properties that matter, and the three `'single'`-mode harnesses have neither.
- [ ] **The wire is mandatory.** Implement `fbWrite`/`fbRead` that strips empty values exactly as Firebase RTDB does: `null`, `{}` and `[]` are **deleted**; an all-`null` array vanishes whole; a half-dense array returns as an object keyed by index. `false`, `0` and `''` survive. Assert the wire's own behaviour first, before any FLW packet crosses it.
- [ ] **The mock DOM must execute render code.** `getElementById: () => null` short-circuits every `if (!el) return` guard, so no render runs and a throw inside a SYNC applier is invisible. Return real mock elements with `className`, `style`, `dataset`, `textContent`, `innerHTML`, `appendChild`, `querySelector`, `classList`, `addEventListener`, `scrollIntoView`, `getBoundingClientRect` (zeroes are fine — this tier is not layout).
- [ ] Two `vm` contexts: host and one client, each loading `js/games/flw.js` with its own globals. Route the host's `mpSendEnvelope` through the wire into the client's `flwHandleEnvelope`, and the client's ACTIONs back.
- [ ] Accept `FLW_SRC=` so a deliberately-broken copy can be driven through the same wire — a new assertion must be shown to fail before the fix makes it pass.
- [ ] Baseline scenarios for this task:
  - Deal a Showing; host and client agree on `flwPublicVaultCount`, `flwExposed`, `flwLedgerCounts`.
  - The client's private `FLW_HAND` arrives and `flwMyHand` is set.
  - A full turn resolves; no applier throws with render executing.
  - `FLW_SHOWING_END` reaches the client and the result screen renders.

**Verification:** `node tools/verify-flw-loopback.js` — green. Then temporarily break `flwRenderCard` (throw on entry), re-run with `FLW_SRC=` pointed at the broken copy, and confirm the harness **fails**. A harness that cannot fail is not a harness.

**Commit:** `test(flw): loopback harness — Firebase-shaped wire + render-executing DOM`

---

## Task 3 — Round-end reveal on both screens

**Spec:** §4. **Files:** `js/games/flw.js`.

`flwShowShowingResult` already renders survivors' Showpieces. `flwShowGameover` renders nothing but the medal table — so when the Showing that locks the Vault also ends the match, the reveal is skipped entirely.

- [ ] `flwEndShowing` (`flw.js:937-971`): build `reveal` for **both** end reasons. Move `reveal = survivors.map(i => ({ idx: i, gemId: flwHands[i] }))` out of the `vaultlock` branch. For `laststanding` that is a single entry — the last Collector's gem, worth showing.
- [ ] Extract `flwBuildReveal(reveal)` from the inline block at `flw.js:997-1014`. Returns the label + card row. Reads `reveal || []` defensively per the erasure rule even though it is now always non-empty.
- [ ] `flwShowShowingResult` calls it.
- [ ] `flwShowGameover` (`flw.js:1059-1073`) calls it too, above the medal table.
- [ ] While in `flwShowGameover`: it builds an HTML string using `'·'` for 4th place with no fixed-width medal slot. Give it the `1.4rem` fixed leading slot per `ui-style.md` § Gameover podium rank icons — a row with no medal must still reserve the width, or its text starts further left. "Touched anyway" is the documented trigger for that rule.

**Verification:** Add loopback scenarios — end a Showing by `vaultlock` and assert `reveal.length === aliveCount`; end one by `laststanding` and assert `reveal.length === 1`; assert both arrive intact on the client through the wire. Play a single-device match to a game-ending Showing and confirm the gems now appear on the gameover screen.

**Commit:** `fix(flw): reveal final Showpieces on both round-end and gameover`

---

## Task 4 — Shared `bindCardHold` + `refHighlightRow`

**Spec:** §5.1–5.3. **Files:** `js/engine.js`, `js/games/pko.js`, `js/games/shp.js`, `css/styles.css`.

Tap-hold-to-gallery is a documented suite standard shipped twice with near-identical code. A third user earns the extraction.

- [ ] Add `bindCardHold(el, onHold, ms = 500)` to `engine.js`, in the shared-helpers region near `showWhoFirst` / `artMakeZoomable`.
  - **Take SHP's behaviour, not PKO's:** cancel on `touchmove`. PKO omits it, so a scroll gesture starting on a card currently opens its gallery. This is a live fix, not a regression.
  - Listeners: `touchstart` (passive) + `mousedown` start; `touchmove` (passive), `touchend`, `touchcancel`, `mouseup`, `mouseleave` cancel.
- [ ] Add `refHighlightRow(box, attr, id, pingClass, ms = 1600)` to `engine.js` — `querySelector` by attribute, then inside one `requestAnimationFrame`: `scrollIntoView({block:'center'})`, add the ping class, remove after `ms`. No-op when the target is missing.
- [ ] Reduce `pkoBindChainHold` (`pko.js:981-988`) to a one-line delegate. Call sites (`pko.js:965,1201,1254`) unchanged.
- [ ] Reduce `shpBindCardHold` (`shp.js:1488-1498`) to a one-line delegate, preserving its `isWolf ? 12 : cardId` mapping at the call site of `shpOpenHowTo`.
- [ ] Replace SHP's inline highlight block (`shp.js:2064-2069`) with `refHighlightRow(box, 'data-shp-card-id', highlightId, 'shp-ref-row-ping')`.
- [ ] Do the same for PKO's equivalent highlight block if one exists inline; otherwise leave its gallery scroll as-is.
- [ ] `css/styles.css`: `.shp-ref-row-ping` (`:1164`) already exists. Add `.flw-ref-row-ping` (rose `#F6C9DA` / `rgba(232,121,168,0.25)`) and `.pko-ref-row-ping` (`#EBD5A8` / `rgba(133,77,14,0.25)`) in the same `box-shadow` shape.

**Verification:** All PKO and SHP harnesses green (they do not exercise DOM events, so this confirms nothing broke structurally). By hand: on the PKO table, start a scroll gesture on a card and confirm the gallery no longer opens; hold a card and confirm it does. Same on the SHP table.

**Commit:** `refactor(engine): extract bindCardHold + refHighlightRow; PKO gains touchmove cancel`

---

## Task 5 — FLW hold-to-gallery wiring

**Spec:** §5.4. **Files:** `js/games/flw.js`, `css/styles.css`.

Additive — the header `[?]` and the `[?] Gem Manifest` button keep working exactly as they do.

- [ ] `flwOpenHowTo(tab, highlightId)` — add the second parameter. When `highlightId` is set, force `tab = 'gems'` regardless of what was passed. `flwOpenGemManifest()` (`flw.js:329`) is unchanged.
- [ ] `flwRenderGems` (`flw.js:360-380`) — set `row.dataset.flwGemId = g.id` on each row. After the loop, when a `highlightId` was passed, call `refHighlightRow(box, 'data-flw-gem-id', highlightId, 'flw-ref-row-ping')`.
- [ ] `flwSetHowToTab` (`flw.js:383-393`) — thread `highlightId` through to `flwRenderGems`.
- [ ] Add `flwBindCardHold(el, gemId)` → `bindCardHold(el, () => flwOpenHowTo('gems', gemId))`.
- [ ] Bind it at every site showing a **real, identified** gem: hand-row cards, both reveal rows, the Emerald keep-one-of-three cards, the Peek Guard reveal. Not on gallery rows themselves; not on face-down backs.

**Verification:** Hold a card in hand → How to Play opens on The Gems, scrolled to that gem, ringed for ~1.6 s. Hold during a Peek → same. Confirm the header `[?]` still opens on The Rules. Loopback harness green (it does not fire DOM events, but the renders must not throw).

**Commit:** `feat(flw): hold a gem to jump to its row in the Gem Manifest`

---

## Task 6 — Gem placards in the hand row

**Spec:** §6. **Files:** `index.html` (script), `css/styles.css`, `js/games/flw.js`.

- [ ] `index.html` **via Node script**: add `<div id="flw-counterfeit-row" class="flex items-center justify-center"></div>` directly below `#flw-hand-row` (`index.html:8368`), inside the same `flex flex-col gap-3` wrapper.
- [ ] `css/styles.css`: `.flw-placard { flex:1 1 0; min-width:0; }` plus `.flw-placard-sel` carrying the same `#D6336C` ring as `.flw-card-sel`.
- [ ] `js/games/flw.js`: add the `FLW_GEM_SHORT` constant (all ten strings verbatim from spec §6.5) beside `FLW_GEM_EFFECT`. Comment it with why it exists and what it deliberately loses (Topaz's "(or you)", the effect names).
- [ ] Add `flwBuildPlacard(gemId, { selected, dimmed })` → the §6.3 markup: name line `text-[0.58rem] font-bold text-stone-700 leading-tight`, effect line `text-[0.55rem] text-stone-500 leading-tight`.
- [ ] Rewrite `flwRenderHand` (`flw.js:425-462`) to emit `[placard0, card0, card1, placard1]` on your turn and `[placard0, card0]` off-turn. Row gap drops to `gap-1` (0.25rem).
  - Placard mirrors its card's state: `selected` when `flwSelSlot === slot`, `opacity-35` under the Ruby forced lock.
  - Tapping a placard calls the same handler as its card — it is the larger touch target.
  - In `flwCfMode` the placards show the **real** gems (you are choosing which real gem to keep).
  - The per-card mini-label (`Showpiece` / `Drawn` / `Keep` / `Forge?`) stays under each card.
- [ ] Move the Counterfeit token out of `#flw-hand-row` into `#flw-counterfeit-row`, keeping its `Counterfeit` mini-label and its visibility conditions (`flwSyllyMode && myTurn && flwCounterfeitHeld[me] && !flwRubyForcedSlot()`) exactly as they are.

**Verification:** Loopback green. Then **this task is not complete until visual-check pass 1** (task 11) confirms the row fits at 360 px with no horizontal overflow and no placard past three lines. The spec's 94 px figure is a starting point, not a measurement.

**Commit:** `feat(flw): gem placards flank the hand; Counterfeit token to its own row`

---

## Task 7 — Ledger: two columns + tri-state setting

**Spec:** §7.1–7.2. **Files:** `js/games/flw.js`, `index.html` (script), `js/engine-multiplayer.js`.

- [ ] `flwLedgerOn` (bool, `flw.js:15`) → `flwLedgerMode` (`'tally' | 'discards' | 'off'`, default `'tally'`). All three are non-empty strings, so none is at risk from Firebase's empty-value erasure.
- [ ] `flwRenderLedger` (`flw.js:395-414`): grid becomes `1.1rem 1fr auto auto 1.1rem 1fr auto auto`. Emit rows in the order `9,4 / 8,3 / 7,2 / 6,1 / 5,0` so each visual column reads descending. Fade + strikethrough for exhausted gems unchanged. Branch on `flwLedgerMode`: `'tally'` → this grid, `'discards'` → `flwRenderDiscardStrip()` (task 9; stub it as a placeholder for now), `'off'` → the existing "count the discards yourself" line, reworded.
- [ ] `index.html` **via Node script**: replace the `#btn-flw-ledger-toggle` toggle card (`index.html:8416-8421`) with a pill-group card — three pills `data-flw-ledger="tally|discards|off"`, base class `pill`, active `pill-active-flw`. Rewrite the description to cover all three modes. Labels are literal, so **no DD-13 dynamic value line is needed**.
- [ ] `js/games/flw.js` settings wiring (`flw.js:1333,1335`): drop `flwSyncToggle` for this setting; add `flwBindPills('data-flw-ledger', v => { flwLedgerMode = v; })` alongside the other four pill groups, and sync it in the settings-UI sync function.
- [ ] `js/engine-multiplayer.js` — **both halves**:
  - `mpSerialiseSettings` `case 'flw'` (`:863-865`): `flwLedgerOn` → `flwLedgerMode`
  - `SETTINGS_SYNC` deserialiser `case 'flw'` (`:1052-1059`): same rename
  - Missing the second is the documented CJAR failure — the client's settings overlay silently shows its own defaults.

**Verification:** Loopback assertion: set each of the three values on the host, send `SETTINGS_SYNC`, assert the client's `flwLedgerMode` matches — all three, not just one. Confirm the ledger card's rendered height roughly halves.

**Commit:** `feat(flw): two-column Ledger; Appraiser's Ledger becomes Tally / Discards / Off`

---

## Task 8 — Discard feed: choke point + packets

**Spec:** §7.3–7.4. **Files:** `js/games/flw.js`.

The strip needs a chronological list. `flwDiscards` is per-player and unordered across players; `flwPublicLog` is text.

- [ ] Add `let flwDiscardFeed = [];` — `[{ g: gemId, p: playerIdx }]`, chronological, newest last.
- [ ] Add the choke point:
  ```js
  function flwDiscard(idx, gemId) {
    flwDiscards[idx].push(gemId);
    flwDiscardFeed.push({ g: gemId, p: idx });
  }
  ```
- [ ] Convert **all five** `flwDiscards[...].push(...)` sites to call it: `flw.js:501` (expose), `:749` (normal play), `:779` (forged Counterfeit — pushes the **claimed** id deliberately; the feed inherits that, which is correct, the strip is a public record), `:790` (Recut), `:804` (Emerald). One choke point, not five — a sixth site added later inherits the feed for free, which is the same discipline the private-hand repair rule states.
- [ ] `flwDealShowing` (`flw.js:182`): reset `flwDiscardFeed = []` beside `flwPublicLog = []`.
- [ ] **Both halves of the erasure rule.** Add to the packets:
  - `FLW_SHOWING_START` (`flw.js:196-204`) → `discardFeed: []` — an empty array is erased in flight, so without an explicit rebuild the client carries the previous Showing's feed forward
  - `FLW_RESOLVE` (`flw.js:872-880`) → `discardFeed: flwDiscardFeed`
  - `FLW_SHOWING_END` (`flw.js:967-968`) → `discardFeed: flwDiscardFeed`
  - Every corresponding applier: `flwDiscardFeed = d.discardFeed || [];` — **never** assign the raw field.

**Verification:** Loopback assertions, and these are the ones that earn the harness:
- After several plays, host and client feeds are identical in order and content.
- Start a second Showing and assert the client's feed is `[]` — this is the case the wire's empty-value stripping actually exercises. Confirm it fails against a copy that assigns `d.discardFeed` raw.
- A forged Counterfeit puts the **claimed** id in the feed, not the real one.

**Commit:** `feat(flw): chronological discard feed with a single choke point`

---

## Task 9 — Discard strip render

**Spec:** §7.5. **Files:** `js/games/flw.js`, `css/styles.css`.

- [ ] `flwRenderDiscardStrip()` — replaces the task 7 stub. Horizontal `overflow-x:auto` row of `.flw-card-sm` faces, newest **last**, each with a tiny owner initial below (`text-[0.5rem] text-stone-400`).
- [ ] After render, `el.scrollLeft = el.scrollWidth` so the newest is visible — same idiom as `flwRenderLog`'s `scrollTop` (`flw.js:422`).
- [ ] Newest entry takes `.flw-card-sel` so the eye lands on the most recent play.
- [ ] Each card gets `flwBindCardHold` (task 5).
- [ ] Empty state: `<p class="text-stone-400 text-xs">Nothing discarded yet.</p>`
- [ ] The strip's container must not make the Stack scroll horizontally — it scrolls **inside** its own `overflow-x:auto` box.
- [ ] The `[?] Gem Manifest` button in the ledger card header (`index.html:8358`) stays visible in all three modes.

**Verification:** Loopback: render in `'discards'` mode on the client after a resolve and assert no throw with the render-executing DOM. By hand: play several turns, switch the setting, confirm the strip fills, scrolls to newest, and holding a card opens its gallery row.

**Commit:** `feat(flw): discard strip as the second Appraiser's Ledger view`

---

## Task 10 — "Collectors" copy pass + delete the duplicated gem list

**Spec:** §8, §10.1. **Files:** `js/games/flw.js`, `index.html` (script).

No player noun exists today — shipped copy says "rivals", "survivor", "last one standing".

- [ ] `FLW_GEM_EFFECT[0]` (`flw.js:343`): "sole survivor" → "sole Collector".
- [ ] `index.html` **via Node script**, How-to Rules tab:
  - Step 2 (`:8498`): "rivals" → "rival Collectors"
  - Step 3 (`:8503`): "every survivor reveals" → "every Collector still in reveals"
- [ ] `index.html` **via Node script**: **delete** the "The Gems" card (`:8506-8518`) — ten hardcoded gem names and effects duplicating `FLW_DECK` + `FLW_GEM_EFFECT`, and now a third copy alongside `FLW_GEM_SHORT`. The Gems tab already carries the same content rendered from the deck, with artwork, one tab away. This is the same reasoning that folded the Gem Manifest into How to Play originally (`flw.js:325-328`).
- [ ] Grep `js/games/flw.js` and the FLW region of `index.html` for any remaining "survivor" / "player" used as the game's noun and convert. Leave `flwAliveCount`'s internal `survivors` variable alone — it is code, not copy.

**Verification:** Grep confirms zero "sole survivor" and zero occurrences of the deleted `<li>` strings. Open How to Play and confirm The Rules tab reads correctly with the card gone and The Gems tab is unaffected.

**Commit:** `feat(flw): players are Collectors; drop the duplicated gem list from The Rules`

---

## Task 11 — `visual-check` measurement passes

**Spec:** §11.2. **Files:** none (measurement only; findings feed back into tasks 6/7/9).

No harness reaches layout — a mock element has no box.

- [ ] **Pass 1 — hand row** at 360 px and 390 px viewports. `placard | card | card | placard` fits with no horizontal overflow; no placard exceeds three lines. Test case is the longest string, `Bonus if sole Collector with one`. **This gates task 6.** If it fails, the documented fallback is dropping the name line from the placard — the carat is on the card and hold-to-gallery gives the name.
- [ ] **Pass 2 — full table Stack**: two-column ledger + discard strip + hand row + counterfeit row + CTA. Measure total height; confirm the Stack still reads as one unit and the primary CTA is reachable.
- [ ] **Pass 3 — gallery rows**: artwork, name and description aligned; no clipped frames at `sm`. This is the original reported misalignment — confirm it is gone.
- [ ] **Pass 4 — art viewer** beside the card it opened from: the viewer shows the raw square image with no frame, and there is now only one border in the app.
- [ ] Record measurements in `docs/implementation-notes/flw-implementation-notes.md` — the numbers are the evidence that tasks 6 and 7 landed.

**Verification:** The passes are the verification. Any failure returns to its owning task before task 12.

**Commit:** `docs(flw): visual-check measurements for the reworked table`

---

## Task 12 — Art contract (gated on new artwork)

**Spec:** §9. **Files:** `data/art/flw/img/*`, `docs/art-authoring-guide.md`, `sw.js`.

Last because it is the only task that needs the owner to produce something.

- [ ] Update `docs/art-authoring-guide.md`'s FLW entry: **square**, **512 × 512** JPEG, **60 KB/file** ceiling, **no text and no border baked in** — the carat is a CSS placard and the frame is CSS. State why 512: FLW's largest consumer is the art viewer (~340 CSS px, ~1020 device px at 3× DPR), not the on-table card (`lg` = 88 CSS px). Do not inherit PKO's 40 KB — the render sizes are different.
- [ ] Owner regenerates all ten faces plus `back.jpg`. Convert with `tools/convert-core-art.ps1`.
- [ ] Confirm `data/art/flw/pack.json` needs **no change** — same keys, same filenames.
- [ ] Confirm `sw.js` `PRECACHE_URLS` needs **no change** — same paths (`sw.js:82-93`).
- [ ] **Bump `CACHE_NAME` v182 → v183** (`sw.js:4`). Mandatory: the bytes changed even though the paths did not. Without it, installed devices keep serving the old portrait JPEGs forever. This is the entire difference between core art and a skin pack.
- [ ] Verify the total: 11 files ≤ 660 KB.
- [ ] Offline install check per `docs/art-authoring-guide.md` § 7 — install, go offline, open How to Play → The Gems, confirm every tile still offers to enlarge (a tile with no artwork gets neither the zoom cursor nor a handler, so a missing precache is visible).

**Verification:** Offline install check passes. All gem cards show art with the CSS placard sitting on a clean gem, no doubled numerals.

**Commit:** `feat(flw): square core art, no baked text — SW v183`

---

## Task 13 — Documentation closure

**Spec:** §14. Mandatory before any phase snapshot — the snapshot is the final deliverable, not the starting point for cleanup.

- [ ] `docs/code-map.md` — `#flw-counterfeit-row`, `#flw-discard-strip`, `flwDiscard`, `flwDiscardFeed`, `flwLedgerMode`, `flwBuildReveal`, `flwBuildPlacard`, `flwRenderDiscardStrip`, `FLW_GEM_SHORT`, `bindCardHold`, `refHighlightRow`.
- [ ] `docs/rules/game-identities.md` § Game 16 — **full rewrite** (spec §10.2). The section currently documents a different game: a pass-and-declare bluffing loop with ten unrelated gem names and settings `flwLedger` / `flwDiamondsToWin` / `flwSmokeMirrors` / `flwAppraisalClock`. Rewrite Terminology (adding **Collector**), the gem table, Settings, State flow and Special Mechanics against the shipped code. This is the reference a reskin author reads to rename gems — the workflow tasks 1 and 10 exist to enable.
- [ ] `CLAUDE.md` — SW v183, Current Focus entry, compress any closed items to one line.
- [ ] `.claude/rules/logic-engine.md` — `bindCardHold` / `refHighlightRow` in § Shared Library Modules.
- [ ] `.claude/rules/ui-style.md` — § Tap-Hold Reference points at the shared helper instead of describing per-game copies; add FLW to the gallery-tab rollout list's hold-enabled games.
- [ ] `docs/implementation-notes/flw-implementation-notes.md` — the baked-text root cause and its five downstream symptoms; the placard contrast decision; the `flwDiscard` choke point; the visual-check measurements.
- [ ] `docs/implementation-notes/shared-implementation-notes.md` — the `bindCardHold` extraction and PKO's `touchmove` fix (root cause is engine/cross-cutting, so it belongs here, not in pko-impl-notes; leave at most a one-line pointer there).
- [ ] `docs/decision-log.md` — one entry, newest on top: art carries no text or chrome; square masters; § Game 16 drift found and corrected.
- [ ] `docs/deferred-work.md` — close the FLW items this round covers (the FLW How-to gallery entry, the Decision Modal button-sizing divergence if FLW's was addressed).

**Verification:** Re-read each doc against the shipped code. Every new ID and function present; no stale `flwLedgerOn` anywhere.

**Commit:** `docs(flw): close the gem seam round — game-identities § 16 rewritten`

---

## Task ordering and what can be parallelised

```
1 (seam) ──▶ 2 (harness) ──┬──▶ 3 (reveal)
                           ├──▶ 6 (placards) ──┐
                           ├──▶ 7 (ledger) ──▶ 8 (feed) ──▶ 9 (strip)
                           └──▶ 10 (copy)      │
4 (engine helpers) ──▶ 5 (FLW hold wiring) ────┘
                                               ▼
                                        11 (visual-check)
                                               ▼
                                    12 (art) ──▶ 13 (docs)
```

Tasks 4 and 5 are independent of 3/6/7 and can run in either order relative to them — but 5 must
land before 9, since the strip binds the hold. Tasks 6 and 7 both touch `index.html`; do them in
separate script runs, not one combined script, so a failure is attributable.
