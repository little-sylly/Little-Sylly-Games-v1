# SS (Secret Signals) — Implementation Notes

## Design Decisions

**Hybrid multiplayer mode**
SS supports both Individual Devices and 2-Device Teams (`supportedModes: ['ptp','tlm','mdlm']`, `recommendedMode: 'tlm'`). Most games are one or the other — SS is the only hybrid game in the suite. *(Corrected June 2026 audit: there is no `supportsHybrid` field anywhere in code — hybrid behaviour comes from supporting both TLM and MDLM.)*

**Vault security — both vaults broadcast (couch security), not targeted writes**
As of the S11/S12 MDLM rework (June 2026), `SYNC: SS_VAULT_DATA` carries BOTH vaults (`vaultA` + `vaultB`) to every device; each device renders only its own team via `ssMyTeam()`. This is deliberate couch security — the same model as NAT (role data is broadcast; each device shows only its own role). It is sufficient for a same-room game; full cryptographic separation would require targeted per-device Firebase writes. *(Supersedes the earlier "Team B vault only, broadcast not targeted" note — with full MDLM, both vaults must reach every device so any player on either team can see their own vault.)*

**Secret Mode expansion hook is inline, not a named function (June 2026 audit — Check G resolution)**
SS has no `ssApplyExpansionOverrides()` — the override read is inline in `ssConfirmPlayers()` (applies `ssDifficultyLevel`, `ssSettingInterceptsToWin`, `ssRerollLimitSetting`, `ssIntelSyllyMode` and force-disables vault customisation), and `ssBuildVaults()` / `ssRerollWord()` branch on `isSecretMode` to draw from `secretWords`. The hook is functional; only the naming convention differs. Note: the Lobby Mode host path (`startSyllySignals()` → `ssBuildVaults()`) bypasses `ssConfirmPlayers()`, so expansion *overrides* (not the word pool) are skipped in multiplayer Secret Mode sessions.

**Fuzzy matching — compound word handling**
`ssFuzzyMatch` is plural/singular aware and compound-word aware (hyphen/space split, ≥3 char components). Solid compounds (no separator) do NOT auto-split — store as "Weight-Lifting" to enable matching. This is SS-specific; do not apply to other games without testing.

**Customise Vault setting — curated vs full picker**
`ssCustomiseVault = false` uses a curated 10-category pool. `true` opens the full 16-category picker. Default off to prevent dead-end pairs (e.g. `pop_culture`, `brands`).

**S1 — TLM standby screen vs locking the encrypt flow (Phase 27)**
When the non-encrypting team's device receives `SS_ENCRYPT_TURN` in TLM, two approaches exist: (a) lock inputs and show a "please wait" banner on the encrypt screen, or (b) show a dedicated standby screen. Chose (b) — `screen-ss-standby` — because showing the encrypt screen to the wrong team risks displaying the other team's vault context. The standby screen is content-neutral and shows only the encrypting team's name.

**S2 — Settings vs roster state boundary for player names (Phase 27)**
`ssPlayerNamesA/B` are roster state (persist across play-agains within a session), not settings. The fix clears them only when entering PTP after a TLM session (`window.syllyMultiplayerMode === 'single'` at game-start time). PTP→PTP retains names as before.

**S6 — Intel DR button renamed "Accept It 🤝" and hidden until reveal (Phase 27)**
"Diplomatic Resolution" was too long and bureaucratic. "Accept It 🤝" is concise and thematic. Button is now hidden by default (`style="display:none"`) and shown only after the third failed attempt reveals the keyword — preventing premature reveals and making DR a clean fallback path only after the word is on screen.

**S7 — Word-by-word alternation for intel phase (Phase 27)**
Original: all 4 keywords for Team Leader, then all 4 for Underdog. New: kw0 Team A → kw0 Team B → kw1 Team A → kw1 Team B → etc. Requires `ssIntelDone[team][kwIdx]` tracking matrix. `ssShowIntelSummary()` updated so leader's summary "next" button calls underdog's summary directly — not `ssShowInningTransition` (which would restart guessing).

**S13 — Round 1 is a no-score warm-up for interceptions (June 2026, playtest)**
What/why: a correct intercept in round 1 is pure luck — there's no prior clue history to read, so it shouldn't decide the game. `ssResolve()` now only awards a token when `interceptCorrect && ssRound > 0`. `ssRenderResolution()` mirrors this: a round-1 correct intercept shows a neutral "Correct — warm-up round, no points" badge and a dedicated hype line instead of "+1 Interception". Misfires still count in round 1 (they aren't luck-based). Clients render correctly because `ssRound` is set from `SS_ENCRYPT_TURN` and unchanged during resolution. `ssRound === 0` is round 1 (history stores `round: ssRound + 1`).

**S14 — Vault Rotations: 3-pill → ON/OFF toggle, default OFF (June 2026, playtest)**
The Once/Twice options added no real depth — the meaningful choice is "can broadcasters reroll at all". Collapsed to an ON/OFF toggle (`btn-ss-reroll-toggle`): OFF (`ssRerollLimitSetting = 0`, the new default) hides the reroll affordance entirely; ON (`Infinity`) gives unlimited rerolls. Reroll buttons are only rendered when ON, and the per-keyword count is shown for feedback (no "used/limit" since unlimited). **MP serialisation:** `Infinity` is not JSON-safe (`JSON.stringify` → `null`), so `mpSerialiseSettings` sends the string `'Infinity'` and the receiver restores it — this also fixes the pre-existing bug where the old "Unlimited" pill broke over the wire.

**S15 — Settings label emoji convention (June 2026)**
Removed the `⏱` prefix from "Broadcaster Timer". Established the rule (now in `ui-style.md` § Settings Card Standard): only the `✨ Sylly Mode` card carries an emoji on its label — every other setting title is plain text, so `✨` stays a clear marker for the advanced/last card.

**Encryption Protocol DD-13 value line added. [13 Aug 2026]** Found during the suite-wide DD-13
sweep (`ui-style.md` § Settings Card Standard) — Clear/Scrambled/Deep Space gave no indication of
what word tier each pulls from. SS is the one game where each difficulty pill draws from an EXACT
tier (`w.difficulty === ssDifficultyLevel`), not a cumulative range like most games' difficulty
pills — so the value line uses `definitions.md`'s per-tier language (1 = Standard/concrete nouns,
2 = Wild/verbs+adjectives, 3 = Wilder/abstract) rather than a vague "easier/harder" framing. Added
`#ss-val-difficulty`, populated inside the existing `ssSyncCategoryPills()` (`js/games/secret-signals.js`,
already the shared resync point for settings-open, difficulty click, and category toggles) from
`ssDifficultyLevel`. This card's layout is unusual — description sits BELOW the pills, not above,
predating `ui-style.md`'s standard order — left as-is; the new value line sits between the pills
and that description. **Not verified beyond syntax checks** — no `visual-check`, no live play.

---

## Bug Index

**S1 — TLM code mismatch and vault info leak (Phase 27)**
What happened: In TLM Half 2 when Team B (client) encrypted, the host's `SS_ENCRYPT_TURN` handler called `ssStartHalf()` → `ssGenerateCode()`, overwriting the already-set `ssCurrentCode`. HOST and CLIENT ended up with different codes; HOST also briefly showed the encrypt screen with a wrong code, risking vault exposure.
Root cause: `ssStartHalf()` was always called on both devices on `SS_ENCRYPT_TURN` regardless of which team was encrypting.
Fix: TLM guard added in turn-advancement logic (host side) and in `SS_ENCRYPT_TURN` CLIENT handler (`engine-multiplayer.js`). Non-encrypting device shows `screen-ss-standby`.
Note: Final scoring was unaffected — `SS_RESOLUTION` always sends correct code to CLIENT.

**S3 — Duplicate button ID `btn-ss-how-to` (Phase 27)**
What happened: The game menu "How to Play" button and the encrypt screen `[?]` button shared ID `btn-ss-how-to`. `getElementById` returned only the first (menu), leaving encrypt `[?]` permanently unwired.
Root cause: Encrypt screen `[?]` added without checking for ID collision against the menu button.
Fix: Renamed encrypt screen `[?]` to `btn-ss-encrypt-tip`.
Lesson: See Template Gaps.

**S8 — Attempt 3 border ring applied to row wrapper (Phase 27)**
What happened: `ssLockAttemptInputs()` applied the red ring to the `.jec-attempt-row` wrapper div, causing the border to frame both the "Attempt 3" label and the input.
Root cause: Ring applied at row level, not input level.
Fix: Rewrote `ssLockAttemptInputs()` to select only the `input` element within the locked row.

**S9 — Lobby Mode client double-applies resolution (June 2026 audit, RESOLVED)**
What happened: The client's `SS_RESOLUTION` handler sets `ssTokens`/`ssMisfires`/`ssClueHistoryA/B`/`ssRoundHistory` from the Host payload (already post-increment), then calls `ssResolve()` — which increments tokens/misfires AGAIN, pushes a duplicate `ssRoundHistory` entry, and re-runs `ssArchiveClues()`.
Root cause: `ssResolve()` is both the resolver and the renderer; the client needed only the rendering half.
Effect: Client's resolution-screen scoreboard is inflated by one token/misfire whenever one was scored; the final round appears twice in the client's Mission Journal at gameover. Self-corrects on the next `SS_ENCRYPT_TURN`/`SS_RESOLUTION` sync; Host state and the win decision are unaffected.
Resolution (June 2026): Split `ssResolve()` into resolve + render halves. `ssResolve()` now does only the authoritative work — score tokens/misfires, push the `ssRoundHistory` entry, `ssArchiveClues()` — then calls the new pure `ssRenderResolution()` (read-only: digit comparison + sound + DOM). The host path (`ssHostMaybeResolve` → `ssResolve` + `ssBroadcastResolution`) is unchanged. The `SS_RESOLUTION` SYNC handler now assigns the authoritative payload (`tokens`/`misfires`/clue histories/`roundHistory` + the `result` round-log entry's `code`/`clues`/`encryptingTeam`/`interceptGuess`/`decodeGuess`) and calls **only** `ssRenderResolution()` — no second increment, no duplicate push, no re-archive.
Lesson: Split resolve-and-render functions before reusing them in SYNC handlers — clients render authoritative payloads, they never re-resolve.

**S10 — No `btn-mp-action` on any SS submit button; double-tap can double-resolve (June 2026 audit, RESOLVED — engine backstop)**
What happened: `mpLockSync()` only works through the `.btn-mp-action` CSS class, and no SS button has it (true of all eight Phase-22 games — only BLD/GTH/DYB/PASS apply it; `syllySyncLocked` itself is never read anywhere). A client double-tapping "Confirm Code" sends two `SS_DECODE_SUBMIT` ACTIONs; the Host runs `ssResolve()` twice — double token/misfire increments and a duplicated round-history entry on the authoritative device.
Root cause: Sync-lock contract (every submittable MP button carries `btn-mp-action`) was introduced after Phase 22 and never retrofitted. The CSS grey-out was the *only* enforcement; `syllySyncLocked` gated nothing.
Resolution (June 2026): made `syllySyncLocked` actually gate ACTION sends at the single choke point — `mpSendEnvelope()` in `engine-multiplayer.js`. A fresh `mpLockSync()` authorises exactly one ACTION (`mpActionAuthorised`); a double-tap re-enters `mpLockSync()` (now a no-op while locked, so it does not re-authorise) and the duplicate ACTION is dropped in `mpSendEnvelope()`. Class-independent, so it fixes all 12 games at once. Fire-and-forget ACTIONs that intentionally never lock (NAT votes/disputes/guesses, YGI takes/votes, JEC prep, SS encode/vault, LTTP messages) see `syllySyncLocked === false` and are unaffected — a naïve "drop all ACTIONs while locked" fix would have broken those *and* killed the legitimate first send (the lock is set immediately **before** the send).
Outstanding (cosmetic only): the eight Phase-22 games still lack `btn-mp-action`, so their submit buttons don't visually grey out during the Firebase round-trip. Double-tap is now functionally harmless regardless. Adding the class is a separate polish pass.
Lesson: a sync-lock backstop belongs at the send choke point, not solely in a CSS class every game must remember to apply. The class is now visual feedback, not the correctness mechanism.

**S11 — SS multiplayer assumes exactly 2 devices (RESOLVED June 2026)**
What happened: All lobby-mode guards treat `mpMyPlayerIdx` as a team index: `ssMpVaultReady[mpMyPlayerIdx]`, `ssEncryptingTeam === mpMyPlayerIdx`, the intercept/decode submit guards. With MDLM (roster permits `ssPlayerCount × 2` devices) any device with index ≥ 2 can never submit, and the broadcast `SS_VAULT_DATA` SYNC would hand Team B's vault to extra Team A devices. `mpSerialiseSettings('ss')` also omits `ssSelectedCategories`, and client vault rerolls are local-only (no ACTION) — the Host's copy of Team B's vault goes stale after any client reroll.
Root cause: SS lobby mode was built and tested as TLM (2 devices); the MDLM mode pill was enabled without per-player plumbing.
Fix (full MDLM build, not the 2-device cap): introduced a device→team map `ssTeamDevices[team] = [playerIdx,…]` built from `mpLobbyRoster.playerTeamIdx` (TLM falls back to `[[0],[1]]`). Per-device readyChecks (`ssMpVaultReady` length = `ssTotalDevices()`); broadcaster/guesser of record derived by rotation: `ssBroadcasterIdx(team) = devices[ssRound % n]`, `ssGuesserIdx(team) = devices[(ssRound+1) % n]` (the next transmitter decodes — for a team of 1 this collapses to the broadcaster, which is correct TLM behaviour). TLM and MDLM now run ONE device-routed code path. Both vaults broadcast in `SS_VAULT_DATA` (couch security — each device renders only its own team via `ssMyTeam()`). `ssSelectedCategories` added to `mpSerialiseSettings('ss')` for completeness (host is the sole vault builder, so it does not change client vault contents).
Lesson: A TLM team is just an MDLM team of one device where broadcaster === guesser — unify the two onto a single device-routed path rather than branching on mode. Don't team-index `mpMyPlayerIdx`; map device → team once and route everything through it.

**S12 — Intel Phase has no multiplayer support; client crashes on Team B's intel turn (RESOLVED June 2026)**
What happened: Phase 2 has zero MP packets. After `SS_ENDGAME`, both devices show the splash with the Phase 2 button; each device that taps it runs the pass-the-phone Intel Phase locally. The client never receives Team A's vault (`ssVaultA` is `[]` on a fresh client), so the moment Team B's guessing turn starts, `ssIntelTargetVault()[ssIntelKwIdx].word` throws.
Root cause: Intel Phase shipped pre-multiplayer and was never intercepted; `ssIntelSyllyMode` is still serialised to clients, so the broken path is reachable.
Fix (kept Sylly available, did not force it off): host-authoritative Intel Phase driven by ONE snapshot packet `SS_INTEL_SYNC` (phases `tiebreak`/`intro`/`keyword`/`summary`/`gameover`). The Intel Phase is fully sequential — exactly one team guesses one keyword at a time, and within it exactly ONE nominated device (lowest seat, `ssIntelGuesserDevice(team) = ssTeamDevices[team][0]`) gets the input UI; every other device sees the clue dossier (the board) and a "discuss!" note. The active guesser resolves locally (found / 3-fail / Diplomatic Resolution override) and commits one outcome on Continue/Next: host applies + advances + broadcasts; a client guesser sends `SS_INTEL_GUESS` and waits. Phase transitions (Phase-2 splash, intro Begin, summary Next, tiebreak picker) are host-driven; clients show "⏳ Waiting for the host…". **Clue-history trap:** clients never run `ssArchiveClues()` (it lives in the host-only `ssResolve`, not the all-device `ssRenderResolution`), so the dossier would be empty — the clue histories are carried in every `SS_INTEL_SYNC` and rebuilt with a Firebase array-drop normaliser (`ssNormalise4`).
Lesson: Secondary phases reached AFTER the core MP loop (intel/guess/tie-break/sudden-death/endgame) are the ones repeatedly shipped pass-the-phone-only — audit them explicitly. When a sequential phase has exactly one active actor at a time, a single host-broadcast state snapshot + a per-device router is far simpler than per-control packets. And watch for state a SYNC handler reads but only the *resolve* half writes (here, `ssArchiveClues` in `ssResolve`): carry it in the snapshot.

---

## Multiplayer Lessons

**TLM: code generation must happen exactly once per half, on the encrypting device only (Phase 27)**
Any call to `ssGenerateCode()` in a TLM session must be guarded to confirm the current device is the encrypting team's device. In TLM, HOST = Team 0 always. Code for Team 1's turn must either be generated on the CLIENT or sent from HOST pre-generated.

**TLM standby screens are necessary for asymmetric-role games (Phase 27)**
In TLM SS, during the encrypt phase, one device is active (encoder's team) and the other is passive. Without a standby screen, the passive device shows a misleading UI or leaks vault information. Pattern: `ssShowEncryptStandby()` is called on TLM guard fire — content-neutral holding screen naming the encrypting team.

**Envelope handler safety: every function called from `mpHandleEnvelope` must exist before shipping (Phase 27)**
If `ssShowEncryptStandby()` had been undefined when called from the CLIENT `SS_ENCRYPT_TURN` handler, the Firebase callback would silently crash, leaving both devices stuck. Grep-confirm every function called from `mpHandleEnvelope` before shipping.

---

## Polish Index (June 2026 audit)

**S13 — Legacy settings overlay format → RESOLVED (15 June 2026).** Bare divs + `<hr>` separators, centred `h3` title restructured to Settings Card Standard (white cards, no separators, left-aligned `h2` with `border-b border-stone-200 flex-shrink-0` title block) via `fix-ss-settings.js` Node script. The scroll-reset in `ssOpenSettings()` queries `.overflow-y-auto` — this was valid for the old structure where the scrollable div had `.overflow-y-auto` as a Tailwind utility; with the new structure the scroll body (`flex-1 overflow-y-auto px-6 py-5`) still carries `.overflow-y-auto` so the existing reset continues to work. The `.overlay-data-inner` CSS sets `height: 80vh; overflow-y: auto` (not via Tailwind) — do not change the reset selector to `.overlay-data-inner` without confirming the new structure still needs it (the sticky Done footer `flex-shrink-0` already clips the scroll body height via flex).
**S14 — "Game Over" generic eyebrow** on `screen-ss-gameover` (Protocol A §3 legacy string) — every other label on the screen is mission-voiced.
**S15 — `btn-ss-customise-toggle` initial class missing `shrink-0`** (JS-applied states include it).
**S16 — No header `[?]` → How to Play on gameplay screens.** The encrypt screen's header `?` is a contextual tip (`btn-ss-encrypt-tip`); no SS gameplay screen offers the how-to overlay mid-game (ui-style § Help icon `[?]`).
**S17 — Round numbering offset when Team B encrypts first.** `ssNextHalf()` increments `ssRound` after Team 1's half, so if Team B goes first, "Round 1" contains only Team B's broadcast and every later round pairs A-then-B. Alternation and scoring are unaffected; Mission Journal grouping is cosmetically lopsided.

---

## Template Gaps

**Contextual `[?]` buttons need unique IDs enforced by convention (Phase 27)**
The S3 duplicate-ID bug happened because the encrypt-screen `[?]` and the menu "How to Play" button both received `btn-ss-how-to`. Convention: in-game contextual tips must use `btn-[abbr]-[phase]-tip` format; menu How to Play buttons use `btn-[abbr]-how-to`. Should be called out explicitly in the new-game checklist in `logic-engine.md`.

**Word-by-word alternation phases require a "done" matrix, not a simple counter (Phase 27)**
When two teams alternate per keyword, a simple index counter isn't enough — you need to know whether BOTH teams have attempted each keyword before advancing. The `ssIntelDone[team][kwIdx]` boolean matrix is the correct pattern. Future games with alternating multi-step phases should design this tracking matrix upfront in the tech spec.

**Intel summary routing: direct call, not transition screen, after final keyword (Phase 27)**
After word-by-word alternation finishes, calling `ssShowInningTransition` between the two summary screens incorrectly restarts the guessing sequence. Direct call `ssShowIntelSummary(underdog)` is correct. Transition screens are for advancing between guessing turns, not between summary screens.
