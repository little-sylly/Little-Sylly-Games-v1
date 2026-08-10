# Fruit Salad (FRT) — Implementation Notes
**Game 14 · Cockroach Poker · MDLM-only · `js/games/frt.js`**
Spec: `docs/new-game-tech-fruit-salad.md` · Brief: `docs/new-ideas/new-game-fruit-salad.md`

## Design Decisions

**MDLM-only, couch security**
Hidden hands require individual devices, so there is no PTP/single path (`multiplayerOnly: true`, `supportedModes: ['mdlm']`). True card identities ride in the public room node (`FRT_DEAL`/`FRT_SERVED` broadcast all stashes + the in-flight fruit); each device masks what it shouldn't see (own stash; a passed card stays face-down until *that* device peeks). Same accepted limitation as NAT/SS/BLD — a determined player could inspect Firebase. Owner-confirmed (spec §16A); DOM obfuscation is explicitly **not** treated as a security measure.

**Host-authoritative sequential — NOT a readyCheck game**
Only one actor is live at a time (server → receiver), so there is no simultaneous-submit matrix. The host owns every transition and resolves every challenge; non-active devices render a spectator standby. This is simpler than the readyCheck games (JEC/YGI/GTH) and avoids that whole class of host-self-submission bugs.

**§16B single-pass Sylly resolver — one isolated function per ability**
`frtSyllyResolve(fruit, …)` dispatches on fruit id; Category-A abilities are isolated functions (`frtSyllyLemon`/`frtSyllyPeach`/`frtSyllyGrape`). The invariant: primary flip fires its trigger **once** → forced "secondary" flips push to bowls but fire **nothing** → **one** `frtComputeEliminated` after. Cascades are structurally impossible. Banana returns a `nextServerOverride` (flow control); Apple returns an `appleLock`; the forced-flip trio mutate bowls directly. Rebalancing any ability = editing one function body; replacing = swapping one function. The core loop never changes.

**Render seam `frtRenderCard(fruitId, {faceDown})` — asset-pack ready**
All card DOM goes through this one function; game logic + packets deal only in `fruitId` (0–7). `FRT_FRUITS` is the stable data contract (the `emoji` field is the v1 "skin"). A future image pack changes only this function's body — zero game-logic/packet churn. First emoji-card game; promote to a shared `js/lib/` skin registry only when a 2nd game needs packs (see [[project-asset-pack-direction]]).

**Reveal timer extended to 5s; no confirmation overlay (playtest, June 2026)**
The challenge-resolution screen auto-advanced after 2.6s — players couldn't read the result. Decision: extend to 5s rather than adding a confirmation overlay (a confirmation would drag out every serve). 5s is long enough to process the outcome without feeling like dead time, especially since the fruit log is available. If future playtests still feel rushed, the alternative is a host-controlled Continue button on the reveal screen (same pattern as Fruit Looped).

**Single-target auto-select (playtest, June 2026)**
When only one serve target (or peek-compose target) is valid, the player was forced to tap the only available pill before proceeding. Now auto-selected: `validTargets.length === 1` sets `frtServeTarget` without a tap. Same in peek-compose. Saves a pointless interaction in duel mode and Apple-lock situations.

**Sounds added throughout gameplay (playtest, June 2026)**
No audio feedback existed during play. Added: `playPillClick()` on stash card, target, and declaration pill selections in both serving and peek-compose; `playLaunch()` on Serve, "Slide it →", "Pass it on →"; `playDone()` on Call TRUE and Back; `playBoing()` on Call FALSE; `playWhoosh()` on Peek & Pass. Selection sounds make the game feel responsive; distinct sounds for True/False communicate the action's nature.

**2-player "Pear of Fruits" duel auto-engages**
Player count is lobby-driven in MDLM, so the duel isn't a manual toggle — `frtIsDuel()` = `frtPlayerCount === 2`. Duel changes: 10-card burn pile (54-card deal), no Peek & Pass, 5-card elimination threshold. Sylly Mode is mutually exclusive with the duel (greyed at 2 players), which deletes the entire 1v1 edge-case surface for Apple/Pear/cascades.

**Recoloured banana `#FFC700` → electric lemon `#FFE500` + dark ink (2 Aug 2026)**
Design review for the incoming Cookie Jar game (`docs/new-ideas/new-game-brief-cookie-jar.md` §1/§19) flagged the same class of problem as BLD: white text on `#FFC700` measured 1.57:1 contrast, failing the 3:1 WCAG floor, on every pill/toggle/CTA/card-back that used it. Fix: `pill-active-frt` / `game-toggle-on-frt` / `.frt-range` / `.frt-card-back` / the `bg-[#FFE500]` CTA family all moved to the brighter lemon with **dark ink (stone-800, `#292524`)** replacing white — the brighter fill made the old white-text approach worse, not better, so every FRT surface using the fill needed the swap, not just the two named CSS classes. `FRT_FILL`/`FRT_INK` constants in `frt.js` updated to match (`FRT_INK` was previously white by "owner preference" — the WCAG failure supersedes that). The `mk()` button helper in `frtRenderAwait()` and the round-transition button in `frtRenderGameOver()` both special-cased `text-white` and needed the same fix. Light-tint companions (`#FFE9A6` → `#FFF3A6`, card border) moved with it; `#FFF4CC` (settings button rest state) was left as-is — barely distinguishable at that lightness. **Left deliberately unchanged:** the FRT card-name ink and settings-button text colour `#854d0e` — it coincidentally equals PKO's own brand hex (`#854D0E`), but it's just FRT's existing dark-ink tone for text-on-light-tint, not a copy of PKO's identity, and it isn't part of any contrast failure (dark text on light background is already compliant). `FRT_LEAF` (`#047857`, the True/challenge accent) is untouched.

**Banana palette + white text (owner-reversed during testing, June 2026)**
First build used dark-ink `#022c22` on banana `#FFD93B` (a11y-driven — white on bright yellow is low contrast). On seeing it live the owner preferred **white text on a brighter, more saturated banana `#FFC700`** — bolder/cleaner and consistent with the suite's white-on-brand CTAs. Final tokens: **fill** `#FFC700`, **white** ink on fill, **leaf accent** `#047857` for `text-[brand]` on white (how-to step labels — bright yellow is invisible on white). Lesson: a bright-yellow brand still needs a separate dark accent for text-on-white; the on-fill text colour is a judgement call best deferred to the owner's eye after a live look.

## Bug Index

- **`getMuteToggleOnClass()` has no `'frt'` entry** *(found 2 Aug 2026 during the Cookie Jar build; not fixed there — an unrelated game's bug inside a new-game commit is harder to review and to revert).*
  **What happened:** FRT's mute toggle in the sound overlay falls back to `game-toggle-on-stone` instead of `game-toggle-on-frt`, so it shows neutral grey rather than electric lemon when muted mid-game.
  **Root cause:** the map at `js/engine.js:465` lists 16 of 17 games (17 as of cjar shipping, now 18); `frt` was never added. `updateSliderTheme()`'s map *does* have `'frt': 'frt-range'`, so the slider themes correctly and the gap only shows on the toggle.
  **Lesson:** the two maps in `engine.js` are edited together in the new-game checklist but are not verified together. A Protocol C row asserting both maps cover every `activeGameId` would have caught it.

**Mode-screen CTA rendered black text (found in live test, June 2026)**
The "Start Serving" button on `screen-mp-mode` showed dark text while every other CTA was white-on-yellow. Root cause: the colour lives in `MP_GAME_CONFIGS.frt.brandBtnClass` (a separate string in `engine-multiplayer.js`) which the index.html colour sweep never touched — it still carried the old `bg-[#FFD93B] … text-[#022c22]`. Fix: updated `brandBtnClass` to `bg-[#FFC700] hover:bg-[#E6B400] text-white`. **Lesson:** `brandBtnClass` must be updated in lockstep with the in-game button colours — it drives the mode/lobby CTAs and is not covered by an index.html find-replace.

**Post-lobby returned to the game menu instead of into play (found in live test, June 2026)**
After the host confirmed the lobby, the game showed `screen-frt-menu` again, requiring a second "Start Serving" tap. Root cause: `onPassThePhone` (host) called `showScreen('screen-frt-menu')`. Intended flow is menu (set settings) → lobby → **straight into play**. Fix: `onPassThePhone` (host) now calls `frtStartSession()` directly (deals + broadcasts `FRT_DEAL`). **Lesson:** for MDLM games where settings are configured on the menu *before* the lobby, `onPassThePhone` should go directly into the session — the menu re-visit is redundant. (The two project docs disagreed on GTH's pattern here — game-identities says "direct", logic-engine says "menu re-visit"; the direct path matches owner intent.)

**Peek-then-call bug — True/False still active after peeking (found in MDLM test, June 2026)**
After tapping "Peek & Pass", `frtPeeked` was set to `true` and `frtRenderAwait()` re-ran — but the True/False buttons were unconditionally appended *before* the `if/else if` block that controlled which third button appeared (Peek vs Pass it on). Both the "Pass it on →" button *and* the True/False buttons rendered simultaneously. Root cause: button composition was structured as "always append True/False, then conditionally append a third button" rather than branching on the full set. Fix: restructured `frtRenderAwait()` into `if (frtPeeked && canPeek) { … 'Pass it on →' only … } else { … True/False + optional Peek … }`. Edge-case: if a player peeks but all remaining targets have already handled the card (`canPeek = false`), the `else` fallback restores True/False so the player is never stranded without any action.

**Centering — split body/footer + `my-auto` workaround both fail; root fix applied June 2026**
`screen-frt-table` was structured as `h-screen overflow-hidden flex-col` with 4 separate fixed zones: header (top) → opponents → body (`flex-1 overflow-y-auto`) → footer (bottom). The await/reveal/round-end content was in body; buttons were in footer. This meant the header pinned to the top, the footer buttons pinned to the bottom, and only the body content could attempt to centre — and even that failed. Attempted workaround: `my-auto py-4` on content wrappers inside the body. Root cause of the workaround's failure: inside an `overflow-y-auto` container, the computed height equals content height — there is no free space for `my-auto` to distribute, so it silently does nothing and content pins to the top. True fix: restructured `screen-frt-table` to the NT pattern — `min-h-screen overflow-y-auto flex items-center justify-center` with **one** inner `div.flex.flex-col.max-w-sm.gap-3` containing header + opponents + body + footer as siblings. The section centres the entire column as a unit. `my-auto` removed from all content wrappers (harmless but misleading in the new structure). **The section-level `flex items-center justify-center` is the only reliable vertical centering technique. `my-auto` inside `overflow-y-auto` is a broken workaround.** Rule and audit check elevated to `ui-style.md` and `phase-audit.md` — June 2026.

**Disconnection — non-host players dropping mid-game (found in live test, June 2026)**
Reproduced consistently enough to rule out network loss. Likely candidates: (a) uncaught JS exception inside a Firebase `onValue` callback (`mpHandleEnvelope`) silently kills the listener — Firebase re-delivers buffered events against partially-reset state, or the listener detaches entirely; (b) `FRT_MATCH_DISSOLVED` re-delivery on reconnect triggering a spurious `resetToLobby()`; (c) mobile WebSocket being killed by the OS when backgrounded. Defensive fix applied: `frtHandleEnvelope` now wrapped in a top-level try-catch with `console.error('[FRT] envelope handler crash', e, env)` so crashes are logged rather than silently detaching the listener. Root cause not confirmed — open until a crash log is captured in a live session. **Next step:** enable remote debugging on a client device during the next MDLM test and check the console for `[FRT]` errors after a drop.

**Fruit Looped screen auto-advanced with no readycheck (found in playtest, June 2026)**
`frtHostRoundEnd()` stored round-end state and then fired a 3200ms auto-timeout to advance into `frtHostGameover()` or `frtStartRoundHost()`. Players had no time to read/react — the screen flashed past. Fix: removed the timeout entirely. Instead, `frtPendingRoundGameOver` and `frtPendingRoundOpener` hold the round-end decision; `frtRenderRoundEnd()` now renders a Continue button ("See Final Scores →" or "Next Fruit-Off →") for the host/single path, and "Waiting for host…" for clients. Clients already waited on `FRT_DEAL` or `FRT_GAMEOVER` — no new packets needed.

**Own bowl invisible to active player (found in playtest, June 2026)**
`frtRenderOpponents()` skipped `p === me`. Active player could not see their own Fruit Bowl at all. Fix: removed the skip; self renders with `bg-stone-100 ring-1 ring-stone-300` + `👤` suffix to distinguish from opponents. This matters because a player's own bowl drives elimination logic and is strategically relevant.

**Sound button floats detached on gameover screen (found in playtest, June 2026)**
`screen-frt-gameover` had `relative` on the section + `absolute top-4 right-4` on the sound button, combined with `min-h-screen`. Per the audit rule: a `min-h-screen` section makes the button anchor to the very top of the viewport, visually disconnected from the content stack. Fix: removed `relative` from section, moved the button inside the content div as the first child with `self-end` — it now sits in-line with the content stack at the top-right of the centred column.

**Exit button was "✕ Done" routing to lobby (found in playtest, June 2026)**
The gameover exit was labelled "✕ Done" — "tacky" per owner. The ✕ icon implies mid-game quit; a gameover exit should be a calm back-navigation. Fix: relabelled to "← Back to the Box" (standard pattern per `ui-style.md`). JS already called `resetToLobby()` — no logic change needed.

**Sound button broken on all FRT screens (found in playtest, June 2026)**
`engine.js` wires `.btn-open-sound` via a top-level `querySelectorAll` that runs at script-execution time (~line 3810 of `index.html`). FRT's HTML section is at ~line 7558 — it doesn't exist in the DOM yet when the engine selector fires. All newer MDLM games (DYB, GTH, BLD, PASS, NT, SHP) work around this by re-wiring in `DOMContentLoaded`. FRT was the only game still missing this. Fix: added explicit `DOMContentLoaded` wiring for all FRT screen sound buttons (menu, table, deal, gameover). **Lesson:** any game whose HTML appears after `engine.js` in `index.html` must re-wire `.btn-open-sound` in its own `DOMContentLoaded` block.

**Settings button had no audio feedback (found in playtest, June 2026)**
`frtOpenSettings()` opened the overlay without calling any audio function. All other game settings buttons use `playPillClick()`. Fix: added `playPillClick()` at the top of `frtOpenSettings()`.

**Fruit Stock pill order adjusted (playtest, June 2026)**
User requested reorder from Standard | Swift | Mega Salad → Swift | Standard | Mega Salad. Standard remains the default (still carries `pill-active-frt`). Rationale: Swift is the lighter/faster option and reads naturally at the start; Mega Salad is the extreme edge-case and reads naturally at the end.

**Stash grid forced to 4-across (playtest, June 2026)**
`frtRenderServing()` stash row used `flex flex-wrap`, which allowed uneven splits (5/3 at wider viewport widths). With exactly 8 unique fruit types (max 8 stash cards in the grouped view), `grid grid-cols-4` gives a clean 2×4 regardless of viewport width. Same fix applied to `frtRenderStandby()` which also displayed the player's stash. Narrower widths (3/3/2 → 2/2/2/2) are acceptable; 5/3 is not.

**Fruity Personalities modal added (playtest, June 2026)**
Sylly Mode personalities existed in game logic (`frtSyllyResolve`) but were never surfaced to players during a game. Added a new `frt-personalities-overlay` (data slide-up, z-[95]) listing all 8 fruit personalities with their trigger type (on-challenge / passive / on-peek / on-serve). Reachable from: (1) a `[?]` button next to "Fruity Personalities" in the How to Play overlay; (2) a `[?]` button next to "Your stash" label on the serving screen when Sylly Mode is ON. z-[95] is necessary because the overlay can be opened from within `frt-how-to-overlay` at z-[90].

*Build syntax-verified via `node --check`; full live MDLM playthrough still pending.*

## Multiplayer Lessons

**Host-as-participant: direct-resolve, never self-send**
The host is also a player. When the host is the active server/receiver/caller, its action runs the host logic **directly** (`frtHostProcessServe`/`frtHostResolveChallenge`/`frtHostProcessPeekPass`) — never via a self-sent ACTION (the dedup guard drops `originId === syllyDeviceUid`). Clients send ACTIONs; the host's own path bypasses Firebase. (The generalised rule elevated in Protocol C — logic-engine § MDLM Patterns.)

**Firebase drops empty arrays — `frtNorm2D`**
Bowls are all-empty at deal and a stash/bowl can empty mid-round; Firebase strips empty arrays/holes, so a received 2D array can arrive short. `frtNorm2D(raw, n)` rebuilds a length-`n` array with `[]` for missing entries; applied to every received `stashes`/`bowls`. `FRT_DEAL` skips sending bowls entirely and reconstructs them empty client-side. (Same trap documented in GTH/PASS notes.)

**Carry cross-phase flags in the packet that crosses the phase**
The Apple vendetta lock is set at resolve but consumed at the *next* serve, which may be on a client. It's carried in `FRT_CONTINUE.appleLock` so the client next-server actually gets the lock. Likewise the turn-timer `endTimestamp` rides in `FRT_DEAL`/`FRT_SERVED`/`FRT_CONTINUE`.

**SYNC renders, never re-resolves**
Clients' `FRT_ROUND_END`/`FRT_GAMEOVER` handlers render from the authoritative payload (host already awarded tokens / computed Silver Lining) — they never re-run the award or push a second log entry.

**Turn timer = GTH wall-clock `endTimestamp`**
Host computes `endTimestamp` at each timed-phase entry and broadcasts it; all devices run a local display countdown from it; only the host acts on expiry (`frtTimerExpire` → auto-serve truthful / auto-call TRUE). RAF not needed; `frtTurnTimerHandle` cleared in `frtResetState` + on every phase exit (Timer Lifecycle).

## How-to gallery tab (2026-08-10, SW v167)

**What happened:** `frt-how-to-overlay` gained a second tab, `The Rules | The Fruit`, built from
`FRT_FRUITS` through `frtRenderCard` — eight fruit plus the face-down back. Every tile is
tappable-to-enlarge via the engine-owned `artMakeZoomable` / `openArtViewer` (`ui-style.md`
§ Pattern 2a). Closes FRT's half of the deferred gallery item.

**Why it matters beyond convenience:** FRT has core art (v153), and before this the art rendered
**only inside a live match**. On an MDLM game that made the offline install check a four-phone job
to answer a pure service-worker question. It is now single-device: open How to Play offline, and
illustrated fruit means the pack precached.

**Note on the personalities overlay:** `frt-personalities-overlay` (Sylly Mode's Fruity
Personalities) was deliberately left alone. It is *mode-specific rules copy*, not a card reference,
and folding it in would have put Sylly-only content in front of players who never turn Sylly on.

---

## Template Gaps

**No word bank → difficulty-setting exemption applied**
Fruit Salad uses a fixed `FRT_FRUITS` constant, not `words.json`, so it has no word-difficulty tier. Exempt per the non-word-bank carve-out added to `logic-engine.md` during Protocol C. "Fruit Stock" (deck size) is the velocity dial.

**[ELEVATED] All-screen vertical centering — use the NT `min-h-screen` pattern, never `h-screen` split zones**
Any screen that renders content + buttons as one visual unit must put everything (header, content, buttons) as siblings inside a single `div.flex.flex-col.max-w-sm` centred by `section.flex.items-center.justify-center.min-h-screen.overflow-y-auto`. Never split content and buttons into separate body/footer zones unless you genuinely need `h-screen` sticky-footer behaviour (button must remain visible during scrolling). `my-auto` inside `overflow-y-auto` is a broken workaround — it silently does nothing. Rule now lives in `ui-style.md` § Centered Content Layout and `phase-audit.md` § Mobile-First Layout Audit. *The majority of existing game screens across the suite have NOT been migrated yet — this is an ongoing remediation task.*

**Deferred (post-build): deal-interstitial animation**
`screen-frt-deal` is currently a static placeholder — gameplay routes straight to the table after a brief beat. Animation deferred post-launch.

**Banana slider appeared black (post-launch, June 2026, RESOLVED)**
The sound overlay volume slider rendered in the browser's default black/grey instead of the banana `#FFC700` theme colour when FRT was the active game. Root cause: `updateSliderTheme()` in `engine.js` maps `activeGameId` → a CSS range class, but the `'frt'` key was missing from the map — it fell through to the stone-range fallback. Fix: added `'frt': 'frt-range'` to the map. The `frt-range` CSS class already existed in `css/styles.css`; only the JS mapping was absent. Lesson: whenever a new game's range CSS class is added, the `updateSliderTheme` map in `engine.js` must be updated in the same change. The map and the CSS class are a matched pair.

---

## Core Art (2026-08-01, SW v153)

**What happened:** FRT became the third game (after PKO, FLW) to ship a **core art pack** — the 8 fruit faces are now real bitmap art (`data/art/frt/`) instead of the emoji-on-banana-fill card. Zero JS changed: `frtRenderCard` already resolved `assetFace('frt', fruitId)` / `assetBack('frt')` through `js/lib/art.js`, so this was art + manifest + registry + precache only, exactly as `docs/expansion-guide.md` § Core art packs promises. Third run through `tools/convert-core-art.ps1` — id map came straight from the shipped `fruity-fruits` skin's `pack.json` (banana→0 … apple→7), no ambiguity to resolve.

**Where the art came from:** the **`fruity-fruits` skin pack** (`data/packs/fruity-fruits/`). Promoting it meant the same three things as the FLW run: (1) convert the 9 masters (8 fruits + back) into `data/art/frt/img/`, (2) add `frt` to `data/art/registry.json`, (3) remove `fruity-fruits` from `data/packs/registry.json` — a Terminal skin identical to the new default is a pointless re-download. `data/packs/fruity-fruits/` itself was left in place (matches the FLW precedent: `prismatic-gems` folder wasn't deleted either).

**Dimensions — no upscale needed, same call as FLW:** the masters were 337×450 PNGs, already close to card aspect and already small (a 1× card render is ~72px wide), so the converter held `$cardWidth` at the source width (337) rather than PKO's 360px default. All 9 files landed well under the 40 KB/card ceiling: 1.0 MB PNG → **220 KB JPEG** total. 8 of 9 landed at q88 (the quality walk's top step); only `back.jpg` (busier repeating leaf pattern) needed a step down to q72 to fit, same pattern as PKO's bee.jpg bottoming out on busy art.

**Skipped deliberately:** an `await artReady` guard at FRT's entry point, same reasoning as the FLW run — `frtRenderCard`'s first live call is several screens past app boot (menu → settings → lobby → deal), far longer than the two local fetches (`registry.json` + `pack.json`) `artLoadCore()` needs. Revisit only if a fruit card is ever observed rendering the old CSS/emoji token instead of art.
