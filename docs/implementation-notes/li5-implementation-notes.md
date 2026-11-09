# LI5 (Like I'm Five) — Implementation Notes

## Design Decisions

**Single-screen setup — no player name tracking**
LI5 tracks teams (Crayon Crew / Glue Stick Gang), not individual players. No Screen 2 for player names. The simplest team game in the suite.

**nono_list dual-use — Broad Shield + Natural Selection**
`nono_list[0]` serves as the Broad Shield in LI5 (describer cannot hint at the category) AND as The Mole's Grouping in NAT. Any edit to an animal's `nono_list[0]` affects both games. See Dual-Use Contract in `CLAUDE.md`.

**Sylly Mode — renamed "Extra Credit"; The No-No List! setting removed (playtest feedback)**
Sylly Mode was renamed from "Wild Words" to "Extra Credit" and the "The No-No List!" setting (5 / 10 words) was removed from settings. Extra Credit words now always display 10 nono words; regular words always display 5. `settingTabooCount` variable removed entirely — `renderTabooList` uses `currentWordIsSylly ? 10 : 5` inline. The `LI5_ROUND_START` broadcast slice uses the same inline logic. `settingTabooCount` also removed from `engine-multiplayer.js` serialise/deserialise for the `li5` case. Playtest rationale: the 10-word option was only interesting in the context of harder Sylly words anyway, so tying it automatically to Extra Credit mode removes a flat/redundant setting.

**Sylly Mode — difficulty 3 words + intensity slider**
`isSylly` is derived at runtime as `difficulty === 3` — never stored. The intensity slider (`#sylly-pct-row`, labelled "Extra Credit Level") is shown only when Sylly Mode is toggled ON. Uses the sub-options pattern (hidden div revealed on toggle).

**TLM alternating roles (Phase 27 — L2)**
Before Phase 27, Host device was permanently the active describer and Client was permanently the tattletale. This was wrong — teams must alternate. Fix: `isClientTurn` field added to `LI5_ROUND_START` payload. When `true`, the Client shows a large word card (their team is describing) and hides the No-No List and CATCH section. Host shows active play as normal (they're the judging team). `isClientTurn` is derived from `currentTeam === 1` which is the alternating index driven by `roundCount`.

**TLM default team names caused swap failure (Phase 27 — L1)**
Swap handler in `engine-multiplayer.js` read from input values that were empty when users hadn't typed custom names. Fix: pre-populate inputs with defaults before swapping so strings are always present.

**Report Card DD-13 value line added. [13 Aug 2026]** Found during the suite-wide DD-13 sweep
(`ui-style.md` § Settings Card Standard) — Gold Star / Honour Roll gave no indication of which
word tiers each pulls from, and this is the one settings card an adult is most likely to tune
deliberately for a specific kid, per the overlay's own "Adults make the rules!" framing. Added
`#li5-val-difficulty`, populated by a new `updateDifficultyVal()` (`js/games/li5.js`) from
`settingDifficulty` (`easy` = `w.difficulty === 1` only, `standard` = `w.difficulty < 3`, i.e.
tiers 1+2 — see the filter in the round-build code). Called on settings-overlay open and on every
difficulty pill click. **Not verified beyond syntax checks** — no `visual-check`, no live play.

**DD-14 — Lobby Mode: MDLM and TLM on one host-authoritative path. [9 Nov 2026, LI5 pilot S1]**
**What:** LI5 gains MDLM (4–12, two groups of ≥ 2, unbalanced allowed) and TLM is folded into the same
code (a device is a group). The host holds deck, scores, clock, log and dobs (`li5H`); every device
renders only what it is sent (`li5V`). Roles rotate per turn — *up the front* / *guessing* /
*tattletales* — and the word reaches only up + tattletales, privately. Spec:
`docs/superpowers/specs/2026-11-09-li5-pilot-design.md` § 5 (owner answers § 5.13).
**Decisions:** (1) **The host broadcasts and then applies the same payload to itself**
(`li5Broadcast` / `li5SendTo` self-delivery) — one applier set renders every device, so host and
client screens cannot drift, and the host-as-guesser's screen path never reads the deck. (2) **One
"who may know" filter** (`li5MayKnow`) feeds the live `LI5_WORD`/`LI5_DOBS` sends and the rejoin
`LI5_STATE`. (3) **The monitor and `isClientTurn` are gone** — TLM-only and asymmetric (Yay/Nay always
on the host's device); now the describing device marks in both modes. (4) **Pure single-source
rules** — `li5Score` / `li5Flip` / `li5Reclamp` / `li5NextTurn`, called by PTP, the MP host and Pinky
Swear; the loopback proves an MDLM and a PTP match fed the same marks write identical Report Cards.
(5) **Private packets that beat their `LI5_TURN`** are buffered (`li5V.early`) and replayed, not
dropped. (6) A PTP Nay that runs the clock out is now logged before the turn ends (it used to vanish
from the Report Card). (7) Miss's asides (`LI5_MISS_ASIDES`, approved copy) replace `HYPE_POOLS`.

---

## Bug Index

**L1 — TLM lobby swap doesn't work with default team names**
Root cause: Swap handler reads `inputA.value` / `inputB.value`, but both are empty when the user hasn't typed a custom name (the displayed placeholder text is not a value). Fix: populate inputs with `rc.defaultTeamNames` before swapping if they're empty. File: `js/engine-multiplayer.js`.

**L2 — Roles never alternate in TLM; Host always describes**
Root cause: No alternation logic in `LI5_ROUND_START`. Both devices always showed the same fixed screen (host = active, client = tattletale). Fix: added `isClientTurn` to the SYNC packet; client branches on this flag to show word-card mode vs full tattletale mode. File: `js/games/li5.js`, `js/engine-multiplayer.js`.

**L3 — No-no list items on tattletale sheet are plain text**
Root cause: `renderTabooList()` rendered `<li>` elements; monitor `<ul>` had no tap handlers. Fix: monitor renders `<button class="li5-nono-word-btn" data-word="...">` elements; event delegation on `#li5-monitor-nono-list` handles taps → sends `LI5_CATCH` with `{ word }` payload → host highlights caught word in active play. File: `js/games/li5.js`, `js/engine-multiplayer.js`.

**L4 — Tattletale heading not centred; hole spacing too tight**
Root cause: "No-No List" heading lacked `text-center`; `#taboo-card` had `pt-4` which placed the hole punch ring too close to the word. Fix: added `text-center` to heading; changed `pt-4` → `pt-8` on `#taboo-card`; adjusted `#taboo-card::before { top: 14px }` in `css/styles.css`. File: `index.html`, `css/styles.css`.

**L5 — Monitor screen ✕ button does nothing; phantom `mpTeardown()` call**
Root cause: `btn-li5-monitor-exit` handler called `mpTeardown()` — a function that does not exist. The `ReferenceError` aborted the handler before `resetToLobby()` was reached. Client was permanently stuck on the monitor screen. Fix: removed `mpTeardown()` call; `resetToLobby()` handles all client teardown internally. Additionally: `resetToLobby()` in `engine.js` now sends a `HOST_END_GAME` LOBBY envelope before calling `syllyTeardownRoom()` so clients see the disconnect overlay immediately via the envelope path, rather than relying solely on the async Firebase room deletion. File: `js/engine-multiplayer.js`, `js/engine.js`.

**L6 — Toy Box deck panel renders behind the settings overlay (June 2026 audit — RESOLVED; found 9 Nov 2026 that `deck-panel` is already `z-[100]`)**
Root cause: `deck-panel` is `z-[60]` while `settings-overlay` (which opens it via "Edit Toy Box ▸" and stays open) is `z-[80]`. Both are 80vh bottom sheets, so the deck panel is fully hidden and untappable — tapping "Edit Toy Box ▸" appears to do nothing. GM's equivalent `gm-deck-panel` is `z-[100]` (correct). Likely regressed when settings overlays were standardised to z-[80]. Fix: raise `deck-panel` to `z-[100]`. Lesson: any sub-panel opened *from* an overlay must sit on a higher z-layer than its opener.

**L7 — Quit-cancel from the gatekeeper screen starts a phantom turn timer (June 2026 audit — RESOLVED; `hideQuitConfirm()` already guards on `screen-active-play` being visible, and since 9 Nov 2026 returns early in Lobby Mode)**
Root cause: `btn-gatekeeper-exit` opens `quit-overlay`, but `btn-quit-cancel` → `hideQuitConfirm()` unconditionally calls `startTimer()` when `!isPaused` — regardless of which screen opened the overlay. On the gatekeeper, the timer then ticks in the background (audible `playTick()`); if `timeLeft` reaches 0 it fires `endTurn()` → re-shows the previous turn's stale Report Card → advancing it double-advances the team rotation. Fix: only restart the timer if the quit overlay was opened from `screen-active-play` (track the opener, or check the visible screen). Lesson: shared cancel handlers must know their opening context before resuming timers.

**L8 — Pinky Swear flips can desync the Report Card delta from the real score (June 2026 audit — RESOLVED; `flipEntry()` clamps sequentially, since 9 Nov 2026 through the shared `li5Reclamp()`)**
Root cause: live play clamps a points penalty to the available score (`points = -Math.min(mult, teamScores[...])`), but `flipEntry()` recomputes flipped entries as a raw `-mult` with no clamp. The turn total is floored via `Math.max(0, scoreBeforeTurn + Σpoints)`, so the score itself stays sane — but the "−N pts this turn" delta label and per-row values can disagree with the actual score change when the floor engaged. Fix: apply the same clamp logic in `flipEntry()` (or recompute all entry points sequentially from `scoreBeforeTurn`).

**L9 — When the second group won the toss, the first group lost a turn [9 Nov 2026, LI5 pilot S1]**
**What happened:** PTP's `endTurn()` chose the next turn with `if (currentTeam === 0)`. With Glue
Stick Gang (team 1) going first, round 1 ended after their turn alone — Crayon Crew got one turn fewer
per match. **Root cause:** turn order hard-coded "team 0 is first" while the toss could pick either.
**Fix:** pure `li5NextTurn(round, team, firstTeam, totalRounds)`, `li5FirstTeam` recorded at the toss;
PTP and the MP host share it. Pinned by `verify-li5-loopback` § 0. **Lesson:** a value the player
chooses (who goes first) must never be re-assumed as a constant later in the flow.

**L10 — The describer's optimistic advance ran after its send; a fast reply was overwritten [9 Nov 2026, LI5 pilot S1]**
**What happened:** a client describer shows `LI5_WORD.next` the instant it taps. The first draft sent
`LI5_MARK` and *then* advanced; whenever the host's `LI5_WORD` for the new card landed first, the
advance overwrote it with an older guess — `null` at the deck's end (the turn froze), otherwise the
*following* card under the current number. The screen still looked right (`renderedCard` dedupes by
cardNo), so a DOM check passed; a dob note would have named the wrong No-No words. **Fix:** advance,
then send. **Lesson:** apply an optimistic update *before* the action whose reply confirms it — and
**assert the view state, not only the screen**, wherever a render dedupe can hide a wrong value.
Mutant 5 in `mutate-li5-loopback.js`.

---

## Multiplayer Lessons

**Mode: 2-Device Teams**
Host device = active describer team. Client device = `screen-li5-monitor` (Tattletale Sheet — shows current word + No-No List with CATCH! button).
`LI5_CATCH` is client → host; no auto score change — it alerts the host only.
`LI5_ROUND_START` syncs word + nonoList to client on each new card.

**`isClientTurn` flag in LI5_ROUND_START (Phase 27)**
When the client's team is describing, `isClientTurn: true` is sent in `LI5_ROUND_START`. The monitor screen switches to a simple word-card mode (large word, no nono list, no CATCH). This keeps the describer's device showing the word while the judging team's device (host) shows the full active play view.

**Pre-populate swap inputs with defaults**
The TLM pre-lobby swap handler must pre-fill inputs with `rc.defaultTeamNames` before reading their values. Empty inputs cause the swap to exchange empty strings, which produces no visible change.

**`mpTeardown()` is not a real function — use `resetToLobby()` directly**
Any game screen's ✕ handler that needs to leave a multiplayer session should call `resetToLobby()` directly. `resetToLobby()` already handles client player ref removal, listener teardown, and mode reset. Do not invent wrapper functions.

**Belt-and-suspenders disconnect notification (Phase 27)**
`resetToLobby()` on the host now sends `HOST_END_GAME` LOBBY envelope before `syllyTeardownRoom()`. This notifies all clients via the events channel immediately (before room deletion). The Firebase `mpRoomListener` on clients still fires as a second path for unexpected disconnects (browser crash, etc.).

**Two harness traps found building `verify-li5-loopback.js` (pilot S1)**
(1) **A host's own ACTION is never a test of refusal.** The dedup guard drops self-sent ACTIONs, so a
wire-injected "is this refused?" check sent from the host passes whatever the code does — the
dob-cooldown mutant survived until `act()` applied a host tap the way the host really does
(`li5HostAction(mpMyPlayerIdx, …)`). (2) **A phone booted with a fast clock never joins** — it drops
every host event stamped before its own join time (`mpJoinListenFrom`). Skew a clock *after* the
match starts.

---

## Template Gaps

**Screen monitor pattern for 2-Device Team games** *(RETIRED 9 Nov 2026 — the monitor is gone; model a new team game on `li5.js` § Lobby Mode: per-seat roles, private words, one applier set)*
If a future team game has a "spectator" or "watcher" screen on one device, model it after `screen-li5-monitor`. Key elements: `li5-monitor-nono-section` and `li5-monitor-catch-section` IDs for show/hide switching, event delegation on the list for per-item tap actions, and `data-word` attribute on each tappable item. The ✕ exit button must call `resetToLobby()` directly — no intermediate wrapper.

**isClientTurn pattern for alternating 2-device roles** *(RETIRED 9 Nov 2026 — superseded by `li5RoleOf(seat, turn, groups)`; TLM is MDLM with one device per group)*
When both devices in TLM need to swap active/passive roles per round, add a boolean flag (e.g., `isClientTurn`) to the SYNC round-start packet. Each device branches on this flag to show the appropriate screen. This is cleaner than maintaining separate state on each device.

## S3 — the gatekeeper as the wipe-and-write round intro (9 Nov 2026, SW v266)

- **Design:** `li5RenderGate()` sets every element to its FINAL state synchronously; `li5GateWrite()` is a cosmetic pass after it (duster over a throwaway span, then `li5Chalk` on the headline + role line, token-guarded so a newer render cancels it). A harness or a late `LI5_TURN` therefore never sees a half-written gate; reduced motion / no WAAPI leaves the final state alone.
- **PTP head** is now *Pass it to [group].* (same as the TLM describing device) — it was the bare group name under *Ready up,*.
- **Harness lesson:** the loopback's mock DOM has no `parentNode` and no WAAPI; render code reads only ids it can see (`li5-gate-aside` got its own id rather than `.parentNode`), and the pure `li5TallySvg` is loaded for real from `li5-scene.js` (the animating kit stays out).
- **Identity doc:** gatekeeper copy block re-pointed at the new strings (`Ready up,` / `My Turn!` are gone).

## S4 — the describer's board (9 Nov 2026, SW v267)

- **One render function.** `li5RenderDescriber()` owns every element of `screen-active-play` for Pass-the-Phone *and* the Lobby Mode describer (Stack rule 4). The word group repaints only when its key (`word|sylly`) changes; everything else is idempotent, so `LI5_DOBS` / `LI5_CLOCK` packets never restart a reveal. PTP's 150 ms card exit is kept: `applyAndAdvance` paints only the tallies at once, the new word follows the exit.
- **Final state first.** The chalk reveal (`li5DescReveal`), Time Out duster (`li5DescTimeoutWipe`), note wiggle and voices are WAAPI passes guarded by `typeof el.animate === 'function'` + reduced motion — the loopback's mock DOM has no WAAPI, so they are skipped there and the final state is what it asserts.
- **The clock is the button.** `btn-pause` wraps `#timer-display` (both ids kept, so `li5RenderClock` and the loopback are untouched). While stopped it takes `li5-clock-frozen` and PTP's handler ignores it (`togglePause` would otherwise resume); **Keep going** is `btn-resume`.
- **The note lives on the tray**, not in the (hidden-in-Time-Out) word content, and is hidden during Time Out and time-up. It covers Yay/Nay/Skip on purpose (departure D2) — the describer answers it first.
- **Voices** are describer-only so far (`li5VoiceFor` on the describer's own tap; one at a time). S5 wires the other roles off `LI5_CARD.last`, keyed by `cardNo`.
- **Removed:** `skip-turn-overlay` (+ engine teardown line, doc rows, code-map row), `btn-end-turn`, `#hype-phrase`, `HYPE_PHRASES`, `showHypePhrase/showPenaltyPhrase`, `pulseScore`, `score-display`, and the styles.css rules `#taboo-card`, `#active-word-card` (a global `min-height: 14rem` that would have fought the board), `.taboo-list-clean/hard`. **Left as dead CSS** (unreferenced now, sweep later): `.sylly-glow`, `.card-enter`, `.hype-pop`, `.streak-fire-*`, `.score-pulse`, `.sylly-hint-show`.
- **Identity doc:** active-play copy block re-pointed (`Score:`, `Word is hidden so no peeking!`, `▶ Let's Continue Playing!`, the skip-turn block gone; `Up the front`, `Clock stopped at`, `Keep going` in). `Clock stopped at` is static markup with the time in a span so the checker can see it.

## S5 — the tattletale and guessing boards (10 Nov 2026, SW v268)

- **Same board, two new render functions.** `li5RenderTattle()` / `li5RenderGuess()` own every element of their screen (Stack rule 4) and reuse the describer's `.li5-desc-*` board, tally and tray classes; `li5PaintDescTallies(prefix, shown)` was generalised (`li5-desc` | `li5-tt` | `li5-gs`) and `li5DescTimeoutWipe(boardId, headId)` likewise. The old `li5ScoresLine` is gone.
- **Cooldown is CSS-driven.** `li5RenderTattleStatus()` (also on the 1 s clock tick) toggles `li5-cooling` on the list and `li5-dob-hit` on the tapped row (`li5V.lastDob = { cardNo, slot }`); the *Dobbed!* label is a hidden span the class reveals, so the tick never rebuilds the rows. The host's cooldown stays authoritative.
- **Guess has no word slot** — and no timer or note state either; the feed is newest-first, the sticky-note tilt is deterministic from `cardNo` (no re-render jitter), and only the newest entry pops in.
- **Voices** on non-describing devices fire in the `LI5_CARD` applier (after the `lastResolved` re-delivery guard, so keyed by `cardNo` for free), skipped for role `up`. Zones are per-board CSS (tattle: under the header row; guess: beside the **?**).
- **Visual-check:** headless screenshots hang sporadically on this machine (a different screenshot each run, never the same screen) — metrics (`scrollHeight`, tray bottom, no sideways scroll) were the dependable half. 5-word tattle and guess fit at 320×452 / 375×548 / 375×667 (the constant ~6 px is the Stack's own padding, same as the describer); **Extra Credit's 10 words scroll the page at ≤548 px high** — accepted, logged for R14.
- **Identity doc:** tattle / guess copy blocks extended (*The No-No List*, *Time Out*, *Clock stopped at*, *Dobbed!*, *Note passed to*, *Dob again in*, *Shout it out!*, *Skipped*, *in a row!*). Dead CSS in `styles.css` left for the optional sweep.

## S6 — Report Card, Class Dismissed, history, play-again (10 Nov 2026, SW v269)

- **Same pattern as S3–S5:** each surface has one render function that owns every element and writes its final state synchronously (`renderReviewHeader/List`, `showMatchHistory`, `showGameOver`); the chalk of the heading and the star slap are WAAPI passes after `showScreen`, skipped under reduced motion. `li5-sheet-*` (Report Card, on `.li5-board`), `li5-paper-*` (history), `li5-modal` (play-again), `li5-go-*` (gameover) in `css/li5.css`. No packet; `LI5_REVIEW` / `LI5_GAMEOVER` appliers untouched.
- **Chalk glyphs, not emoji.** `REVIEW_MARKS` replaces `REVIEW_ICONS`: ✓ ✗ » carry `\uFE0E` (text presentation) so no platform swaps them for colour emoji; ★ / ✦ mark best word / Extra Credit; Pinky Swear edits say *changed*. Word text now goes through `li5EscHtml` (it was raw into `innerHTML`).
- **Gold star sits on the group card's corner**, clear of the total, beside *Report cards ›* (owner's R2b placement); both cards on a tie. `data-result` on the board = `win | tie | exhausted`. At ≤500 px tall the *Report cards ›* caption and bell are hidden (the card is still the tap target).
- **Dead code removed:** `setTeamBoxState` and the `team-box-*` use on this screen. `li5PaintDescTallies` was not reused for gameover — its ids are `prefix-name/pts-i` and the gameover keeps the legacy `gameover-name/pts-teamN` ids.
- **Harness note:** in the headless page the *first* `showGameOver()` after load leaves the screen `display:none` (boot-time lobby race, seeding artefact — the second call shows it); seed twice. Screenshots measured at 320×452 / 375×548 / 375×667: board and tray inside the viewport, no sideways scroll, Report Card list scrolls with the CTA pinned.
- **Identity doc:** copy blocks updated (*Hot streak!*, *Report cards ›*, *Wipe the board?* …); `verify-identity-docs` green.
