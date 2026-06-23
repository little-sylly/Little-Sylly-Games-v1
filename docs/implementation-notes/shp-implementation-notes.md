# Counting Sheep (shp) — Implementation Notes

Spec: `docs/new-game-tech-counting-sheep.md`. MDLM-only, host-authoritative, host-as-participant. Sylly Mode = Night Terrors (Climb ⇄ Plunge), built last.

---

## Design Decisions

- **Fresh full deck each Night (not a gather-and-reshuffle).** `shpDealNight()` builds a brand-new 62-card Flock via `shpBuildFlock()` every Night (game start and every Deep-Sleep redeal) rather than gathering existing hands+discard+flock. Functionally equivalent for an independent-Night game, and it guarantees card counts (incl. the 2 Wolves) are always whole — a Wolf consumed last Night reappears. Spec §10 described "gather all"; this is the cleaner equivalent. Mid-Night exhaustion is still handled by `shpReshuffleDiscard()`.
- **random-add cards are always playable gambles.** `shpIsPlayable` returns true for `kind:'random-add'` (Skip a Few, Fogged Dream) — they can't be pre-checked, so the player may always gamble them. Only deterministic `add` cards are blocked when they'd overshoot. "No legal line" therefore means: zero non-add safe cards, zero fitting adds, AND zero random-adds. A bust from a gamble routes the *current* player to Deep Sleep (reason `'busted'`).
- **Two-card legality uses best-case detection.** For Heavy Eyelids / Sleep Paralysis (`shpForcedCards === 2`), `shpHasSafePair` treats a `random-add` at its `min` (most favourable) when deciding whether a safe ordered pair exists — avoids false auto-crashes while still letting a genuinely stuck player Deep-Sleep. Edge (a): 1 card → degrade to single play. Edge (c): Heavy Eyelids played as one of the forced two does NOT chain (`shpForcedCards` reset to 1 after).
- **Deep Sleep redeal reuses `SHP_DEAL`.** The crash banner (`SHP_DEEP_SLEEP`) carries only lives/elimination info; the host's tap-to-continue (host-gated per §16 Q4) calls `shpDealNight()` which broadcasts a fresh `SHP_DEAL`. No separate "fresh hands" packet — simpler, and one deal code path.
- **Standings = `[winner, ...elimOrder.reversed()]`** — last eliminated is runner-up.

### Ghost system (chunk 4)
- **Legality generalised to `shpResultHerd` for ALL card kinds.** Originally only `add` cards were range-checked; everything else was "always playable." But Cold Feet (and later the Plunge) can push the Herd *above* the ceiling, at which point an unchanged-Herd card (Doze/reverse/Wide Awake/Heavy Eyelids) leaves you still busted — so it must be illegal. `shpIsPlayable` now compares the card's *resulting* Herd against `shpCeiling` for every deterministic kind; only reducers (subtract/reset/Black-Sheep) stay legal once over. `random-add` is playable only while `Herd ≤ ceiling` (pointless once over — guaranteed bust). This also makes the Plunge ceiling-drop legality work for free.
- **Synchronous turn-gate model for disruptions (no async buffer).** When a Pasture play fills the meter, the host opens the Lottery and the table *gates* on the spend-holder's blind pick (`shpGhostPending`); the chosen nightmare applies immediately — which IS "at the turn-gate," since the upcoming player hasn't acted yet — then `shpAfterAdvance` runs. Simpler than buffering a `shpPendingDisrupt` to fire later, and the effect lands exactly where intended (Cold Feet nudges the Herd before the next play, Sleep Paralysis forces the upcoming player's two-card, etc.). `shpPendingDisrupt` is left declared but unused.
- **Meter charges only once a Sleepwalker exists** (`shpElimOrder.length > 0`) — no ownerless disruptions; the meter UI is hidden until then.
- **Global Echo persists across Deep-Sleep redeals** (carried in `SHP_DEAL.echo`), cleared only when the *next* disruption fires (`shpEcho = 0` at the top of `shpHostResolveDisrupt`). `shpEffectiveAdd` adds `shpEcho` to every Pasture add (and the inline calc in `shpPairFinalBest` mirrors it).
- **Weighted Lottery confirmed:** 300-game sim fired Fog (weight 1) ~1,400× vs ~2,900× for the common nightmares (weight 3) — the cursed-card swap is reliably the rarest.

### Night Terrors / the Plunge (chunk 5)
- **One centralised herd-math function (`shpHerdAfterCard`).** Resolve, legality (`shpIsPlayable`), and two-card pair-simulation all route through it, so the Plunge sign-flip (arithmetic `kind ∈ {add,subtract,random-add}` negated; `set`/`reset` absolute) lives in exactly one place. `shpEffectiveAdd` and `shpResultHerd` were folded into it and deleted.
- **Plunge entry fires only on a PLAYER'S play reaching ≥99** (`shpPostResolve`), never on a ghost effect — keeps the descent decoupled from the Nightmare Meter (spec §12). Cold Feet can shove the Herd over 99 in Climb, but the next *play* is what trips the Plunge.
- **Climb+Sylly legality differs from Climb-base:** in Climb+Sylly, adds and random-adds are *always* legal because reaching ≥99 triggers the Plunge (never a bust); the overflow is intentional (selfish +1→99 snare vs co-op +10→104 runway). Climb-base keeps the strict "adds must fit" rule.
- **Ceiling descent at turn entry (`shpPlungeTick`)**, `shpPlungeGrace = shpPlayerCount` holds it for one full cycle, then `-= shpDrop` (7) each turn. Legality already compares to `shpCeiling`, so the squeeze works with no extra legality code.
- **Two exit paths, both reuse existing machinery:** a Plunge bust is just a normal Deep Sleep (−1 Moon + redeal), and `shpDealNight` resets `phase='climb'/ceiling=99`, so the Plunge exit is automatic. The mercy backstop (Herd driven to 0) calls `shpExitPlunge` directly — no Moon, no redeal, play continues in Climb.
- **Sync:** `phase`/`ceiling`/`grace` ride in `SHP_TURN_RESULT` (and `SHP_DISRUPT_RESOLVED`); clients detect a climb→plunge flip to raise the one-shot "THE PLUNGE BEGINS" flash. No separate `SHP_PHASE_CHANGE` packet was needed — folding it into the turn result is simpler (minor deviation from spec §12's suggested dedicated packet).
- **400-game sim (≈⅔ with Night Terrors on):** overflow runway held at every entry (ceiling ≥99), 31k Plunge entries, both bust and mercy exits fired thousands of times, all games terminated.

---

## Bug Index

- **Wolf draw-trap aborted the initial deal → empty/under-dealt hands.** *What happened:* headless simulation (200 games) threw "no legal line but not auto-deep-slept"; a living opener had an empty hand at Herd 0. *Root cause:* `shpDrawUp` did `break` after consuming a Big Bad Wolf. That's right for a mid-game single-card refill (draw 1 to replace the played card) but wrong at the deal, where the player draws `shpHandSize` cards — a Wolf drawn early aborted the whole deal, leaving 0–N cards instead of the (reduced) cap. *Lesson:* the same draw-up routine serves both single refills and multi-card deals; use `continue` (re-evaluate the `while` against the reduced cap) instead of `break`. Mid-game it stops immediately (hand already at reduced cap); at deal it fills the shrunk hand. Spec §7's "stop drawing" was describing the single-draw case only.

---

## Multiplayer Lessons

### Post-launch fixes (same session)
- **MDLM quit-contract wired to the PASS reference.** Quit-confirm: client sends `SHP_PLAYER_LEFT` then `resetToLobby()`; host's `resetToLobby()` broadcasts `HOST_END_GAME`. Host handles `SHP_PLAYER_LEFT` → broadcasts `SHP_MATCH_DISSOLVED` → `resetToLobby()`; all clients on `SHP_MATCH_DISSOLVED` → `resetToLobby()`. One leaver dissolves the match — no ghost rooms (mirrors PASS/NT/FRT). This is the correct contract; the GTH/DYB/BLD game-menu divergence was NOT copied.
- **Table converted to Centered Content Layout (FRT BUG-02 solution).** `screen-shp-table` originally used the `h-screen` sticky-footer split (header / `flex-1` body with `my-auto` / footer). The herd stack read top-aligned, not centred. Fixed by switching to the section-level centred pattern (`flex items-center justify-center w-full min-h-screen overflow-y-auto` + one `max-w-sm` column holding header/body/footer as siblings) and removing `my-auto` from the render wrappers. The hand is short enough that it doesn't need a sticky footer. **Lesson (going forward):** default game screens to the Centered Content Layout; reserve `h-screen` sticky-footer for screens where a CTA genuinely must stay pinned regardless of content height. Already the documented rule (ui-style § Centered Content Layout / phase-audit mobile checks) — applied here.


- **Headless logic harness caught the Wolf bug before any browser.** A `vm.runInThisContext`-loaded copy of `shp.js` with stubbed DOM/engine globals auto-played 200 single-device games asserting invariants (termination, herd ≤ ceiling between turns, standings = permutation of seats). Cheap, fast, and found a deal-time edge that manual play would rarely hit (needs a Wolf as the opener's first deal card). Worth rebuilding for the ghost + Plunge chunks.
- **Host-as-participant + ACTION routing:** host processes its own taps directly (`shpHostPlayCard`); clients send `SHP_PLAY`; host resolves for `shpActivePlayer` (only the active player's device sends, so seat is unambiguous). Self-sent ACTIONs are dropped by the dedup guard — host never routes its own play through `mpSendEnvelope`.

---

## Template Gaps

- **Ghost-pick has no auto-resolve timer (stall risk).** The disruption table-gate waits on the designated spend-holder's tap, and Counting Sheep has no turn timer. An AFK Sleepwalker stalls the table. Acceptable for a same-room party game in v1, but a future "auto-pick after N seconds" (GTH wall-clock pattern) would harden it. Flag for any future ghost/afterlife mechanic in another game.
- **Single-source herd math paid off for the sign-flip.** Routing resolve + legality + pair-sim through one `shpHerdAfterCard` meant Night Terrors' inversion was a one-line `sgn` change rather than touching every call site. Worth recommending as a pattern for any future game with a "mode that changes card arithmetic." Candidate for `logic-engine.md`.
