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

**L6 — Toy Box deck panel renders behind the settings overlay (June 2026 audit — open)**
Root cause: `deck-panel` is `z-[60]` while `settings-overlay` (which opens it via "Edit Toy Box ▸" and stays open) is `z-[80]`. Both are 80vh bottom sheets, so the deck panel is fully hidden and untappable — tapping "Edit Toy Box ▸" appears to do nothing. GM's equivalent `gm-deck-panel` is `z-[100]` (correct). Likely regressed when settings overlays were standardised to z-[80]. Fix: raise `deck-panel` to `z-[100]`. Lesson: any sub-panel opened *from* an overlay must sit on a higher z-layer than its opener.

**L7 — Quit-cancel from the gatekeeper screen starts a phantom turn timer (June 2026 audit — open)**
Root cause: `btn-gatekeeper-exit` opens `quit-overlay`, but `btn-quit-cancel` → `hideQuitConfirm()` unconditionally calls `startTimer()` when `!isPaused` — regardless of which screen opened the overlay. On the gatekeeper, the timer then ticks in the background (audible `playTick()`); if `timeLeft` reaches 0 it fires `endTurn()` → re-shows the previous turn's stale Report Card → advancing it double-advances the team rotation. Fix: only restart the timer if the quit overlay was opened from `screen-active-play` (track the opener, or check the visible screen). Lesson: shared cancel handlers must know their opening context before resuming timers.

**L8 — Pinky Swear flips can desync the Report Card delta from the real score (June 2026 audit — open, minor)**
Root cause: live play clamps a points penalty to the available score (`points = -Math.min(mult, teamScores[...])`), but `flipEntry()` recomputes flipped entries as a raw `-mult` with no clamp. The turn total is floored via `Math.max(0, scoreBeforeTurn + Σpoints)`, so the score itself stays sane — but the "−N pts this turn" delta label and per-row values can disagree with the actual score change when the floor engaged. Fix: apply the same clamp logic in `flipEntry()` (or recompute all entry points sequentially from `scoreBeforeTurn`).

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

---

## Template Gaps

**Screen monitor pattern for 2-Device Team games**
If a future team game has a "spectator" or "watcher" screen on one device, model it after `screen-li5-monitor`. Key elements: `li5-monitor-nono-section` and `li5-monitor-catch-section` IDs for show/hide switching, event delegation on the list for per-item tap actions, and `data-word` attribute on each tappable item. The ✕ exit button must call `resetToLobby()` directly — no intermediate wrapper.

**isClientTurn pattern for alternating 2-device roles**
When both devices in TLM need to swap active/passive roles per round, add a boolean flag (e.g., `isClientTurn`) to the SYNC round-start packet. Each device branches on this flag to show the appropriate screen. This is cleaner than maintaining separate state on each device.
