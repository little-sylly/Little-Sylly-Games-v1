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

**Banana-leaf palette (3 values)**
A bright-yellow brand can't be one value: `#FFD93B` is illegible both as white-on-banana and banana-on-white. Three tokens: **fill** `#FFD93B`, **dark ink** `#022c22` (text *on* banana — CTAs/pills), **leaf accent** `#047857` (`text-[brand]` on white — how-to step labels). Intentional exception to the white-on-brand CTA convention; keeps `frt` distinct from BLD's white-on-gold.

## Bug Index
*(none yet — build is syntax-verified via `node --check`; live MDLM browser test still pending. Log failures here as they surface.)*

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

**Deferred (post-build): full reference docs + polish**
At the phase snapshot (after live MDLM test): full `code-map.md` section + `game-identities.md` Game 14 entry, plus `ui-style.md`/`game-identities.md` notes on the banana-leaf custom-colour exception (mirrors GTH's sage notes). Optional polish: the deal-interstitial animation (`screen-frt-deal` currently a static placeholder — gameplay routes straight to the table).
