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

**2-player "Pear of Fruits" duel auto-engages**
Player count is lobby-driven in MDLM, so the duel isn't a manual toggle — `frtIsDuel()` = `frtPlayerCount === 2`. Duel changes: 10-card burn pile (54-card deal), no Peek & Pass, 5-card elimination threshold. Sylly Mode is mutually exclusive with the duel (greyed at 2 players), which deletes the entire 1v1 edge-case surface for Apple/Pear/cascades.

**Banana palette + white text (owner-reversed during testing, June 2026)**
First build used dark-ink `#022c22` on banana `#FFD93B` (a11y-driven — white on bright yellow is low contrast). On seeing it live the owner preferred **white text on a brighter, more saturated banana `#FFC700`** — bolder/cleaner and consistent with the suite's white-on-brand CTAs. Final tokens: **fill** `#FFC700`, **white** ink on fill, **leaf accent** `#047857` for `text-[brand]` on white (how-to step labels — bright yellow is invisible on white). Lesson: a bright-yellow brand still needs a separate dark accent for text-on-white; the on-fill text colour is a judgement call best deferred to the owner's eye after a live look.

## Bug Index

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

## Template Gaps

**No word bank → difficulty-setting exemption applied**
Fruit Salad uses a fixed `FRT_FRUITS` constant, not `words.json`, so it has no word-difficulty tier. Exempt per the non-word-bank carve-out added to `logic-engine.md` during Protocol C. "Fruit Stock" (deck size) is the velocity dial.

**[ELEVATED] All-screen vertical centering — use the NT `min-h-screen` pattern, never `h-screen` split zones**
Any screen that renders content + buttons as one visual unit must put everything (header, content, buttons) as siblings inside a single `div.flex.flex-col.max-w-sm` centred by `section.flex.items-center.justify-center.min-h-screen.overflow-y-auto`. Never split content and buttons into separate body/footer zones unless you genuinely need `h-screen` sticky-footer behaviour (button must remain visible during scrolling). `my-auto` inside `overflow-y-auto` is a broken workaround — it silently does nothing. Rule now lives in `ui-style.md` § Centered Content Layout and `phase-audit.md` § Mobile-First Layout Audit. *The majority of existing game screens across the suite have NOT been migrated yet — this is an ongoing remediation task.*

**Deferred (post-build): deal-interstitial animation**
`screen-frt-deal` is currently a static placeholder — gameplay routes straight to the table after a brief beat. Animation deferred post-launch.
