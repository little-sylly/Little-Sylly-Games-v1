# Technical Spec — Pecking Order: Force of Nature (Sylly Mode)

**Phase 2 of Game 17.** Companion to `docs/new-game-tech-pecking-order.md` (the confirmed v1 spec —
still the source of truth for the core loop). This document covers **only** what Force of Nature adds.
Anything not mentioned here is unchanged from v1.

**Status:** Stage 2 — confirmed 1 August 2026.
**Phase 1 source:** `docs/new-ideas/new-game-brief-pko.md` § 7 (design record, deliberately unresolved).
**Supersedes:** the "Phase 2 design record" paragraph in `docs/rules/game-identities.md` § Game 17.

---

## Consistency Audit

| Check | Result |
|---|---|
| Abbreviation collision | None — extends existing `pko` prefix |
| `pkoSyllyMode` serialised in `mpSerialiseSettings` | ✅ already done — `engine-multiplayer.js:842` |
| `pkoSyllyMode` applied in `SETTINGS_SYNC` | ✅ already done — `engine-multiplayer.js:1024` |
| Settings toggle wired | ✅ already done — `pko.js:1868` |
| `force_of_nature_only` Pool guard | ✅ already in `pkoBuildPool()` — `pko.js:188` |
| `mimic` entry in `data/pko-data.json` | ❌ **absent** — the guard above was written for a card that was never authored. §10 below. |
| `opts.alpha` in `pkoRenderCard` | ⚠️ documented as reserved but **not implemented** — §7 below |
| Both v1 harnesses green before starting | `verify-pko-chain.js` 58/58, `verify-pko-loop.js` 123/123 |

---

## §1 — Identity

| Field | Value |
|---|---|
| Sylly Mode name | **Force of Nature** |
| Internal flag | `pkoSyllyMode` (bool, exists, currently inert) |
| One-liner | At the start of every Encounter, a random event from the wild reshapes the rules. |
| Scope | 8 random events + 1 fixed opener; 1 new card (Mimic); 1 new screen; 1 new overlay |
| Player-facing rule count | 9 — deliberately capped; Dark Forest was cut, see §17 D26 |

---

## §2 — State Flow (changes only)

```
pkoStartClash()
  ├─ build Pool (Mimic excluded by force_of_nature_only)
  ├─ deal pkoHoardSize to each player
  ├─ IF pkoSyllyMode:                        ← INVASIVE MIMICRY fires HERE, not at Encounter start
  │    ├─ push 2n Mimics into pkoReserve, shuffle
  │    ├─ each player draws PKO_FON_DEAL_BONUS from pkoReserve
  │    └─ pkoEvent = 'invasive-mimicry'; pkoEventsFired = ['invasive-mimicry']
  └─ PKO_CLASH_BEGIN → screen-pko-hoard

pkoStartEncounter()
  ├─ IF pkoSyllyMode AND pkoEncounterNum > 1:
  │    └─ pkoDrawEvent()                     ← canFire() gate; never redraws
  ├─ IF event has onFire: run it (host only, empty board)
  │    └─ may empty one or more Hoards → pkoResolveClash(winners[]) → RETURN
  ├─ IF track-locked: walk clockwise from pkoLeaderIdx to first playable → pkoTurnIdx
  ├─ PKO_ENCOUNTER_BEGIN { event, eventsFired, alphaIdx, ... }
  └─ IF pkoEvent: screen-pko-event (2.5 s, both sides time locally) → screen-pko-table
     ELSE: screen-pko-table

pkoApplyChallenge()  [successful]
  ├─ remove PLAYED cards from Hoard (raw ids, incl. Mimics)
  ├─ IF Hoard now empty → pkoResolveClash([playerIdx]) → RETURN   ← Carrion never offered
  ├─ IF alpha: survived Alpha excluded from discard, appended to new board, alphaIdx reassigned
  ├─ IF carrion: pko-carrion-overlay, 5 s window → PKO_CARRION { keep[] }
  └─ pkoAfterBoardChange()
```

---

## §3 — Screen Registry

| Screen ID | Purpose | Notes |
|---|---|---|
| `screen-pko-event` | Force of Nature event interstitial | **NEW.** Emoji + event name + one-line blurb. No chrome — auto-advances at 2.5 s, so it qualifies under `ui-style.md` § Global UI Protocol item 5 (interstitial exception), same as `screen-pko-unchallenged`. **Must be added to `allScreens[]` in `engine.js`.** |

No other new screens. `screen-pko-hierarchy` gains joint-winner rendering (§6).

---

## §4 — State Variables

| Variable | Type | Default | Synced | Purpose |
|---|---|---|---|---|
| `pkoEvent` | string\|null | `null` | `ENCOUNTER_BEGIN` | Active event id for this Encounter |
| `pkoEventsFired` | string[] | `[]` | `CLASH_BEGIN`, `ENCOUNTER_BEGIN` | Ids fired this Clash. **Accumulator — resets in-payload at `[]`** per the MDLM rule (`logic-engine.md`, ML-03). Drives Extinction's once-per-Clash gate. |
| `pkoAlphaIdx` | int | `-1` | `ENCOUNTER_BEGIN`, `BOARD` | Index into `pkoMarks`; `-1` = no Alpha |
| `pkoCarrionSel` | int[] | `[]` | — | Device-local Mark indices selected to keep. Same lifetime as `pkoStakeSel`. |
| `pkoEventTimer` | handle | `null` | — | Interstitial auto-advance |
| `pkoCarrionTimer` | handle | `null` | — | Carrion window |

**Timer Lifecycle (binding — `logic-engine.md`):** both handles must be cleared in (1) the quit-confirm
handler, (2) `resetToLobby()`, (3) any early transition out of the phase. `pkoUnchallengedTimer` is the
reference pattern already in the file.

### Constants

```js
const PKO_FON_DEAL_BONUS_DIV = 4;      // bonus = Math.round(pkoHoardSize / 4) → 3 / 3 / 4
const PKO_MIMIC_ID           = 'mimic';
const PKO_CARRION_WINDOW_MS  = 5000;   // first playtest dial — see §17 D31
const PKO_EVENT_SCREEN_MS    = 2500;   // matches screen-pko-unchallenged
```

> **SUPERSEDED at SW v150 (playtest round 4, 1 Aug 2026) — `PKO_EVENT_SCREEN_MS` no longer exists.**
> Both auto-advancing interstitials (`screen-pko-event`, `screen-pko-unchallenged`) now run off a single
> `PKO_INTERSTITIAL_MS = 5000`, deliberately equal to `PKO_CARRION_WINDOW_MS`: 2.5 s was budgeted for a
> winner's *name* and could not carry an event name plus a blurb. Every other reference to
> `PKO_EVENT_SCREEN_MS` in this spec (incl. §11) reads as `PKO_INTERSTITIAL_MS`. See impl-notes **D35**.

---

## §5 — Settings

**No new settings.** Force of Nature is the existing `✨ Sylly Mode` toggle, already serialised.

The settings card **copy** changes — the current text describes an unbuilt feature. New body:

> **Force of Nature**
> Before each Encounter, a random event reshapes the rules — the chain flips, a species is wiped, or
> everyone swaps Hoards. Mimic cards join the deck. Not recommended for your first game.

Remove footnote **‡** from `ui-style.md` § Per-Game Reference → Table B ("PKO's Sylly Mode ships live
but inert") on ship.

---

## §6 — Scoring Logic

**One rule, unchanged in words, wider in reach: emptying your Hoard scores 1 point.**

The brief flagged an inconsistency — Extinction awards a point for being wiped out, The Culling
explicitly cannot win a Clash. **There is no inconsistency to fix.** The Culling discards your
*fewest-held* species and does nothing at all when you hold only one species, so it mathematically
always leaves you at least one card. Extinction has no such guard. Same rule, one mechanic simply
can't reach it. (§17 D27.)

### Multi-scoring — the breaking change

Extinction Event can empty several Hoards at once. `pkoResolveClash` therefore takes an **array**:

```js
function pkoResolveClash(winnerIdxs) {   // was: (winnerIdx)
  winnerIdxs.forEach(i => pkoScores[i]++);
  pkoClashHistory.push(pkoPlayerNames.map((_, i) => (winnerIdxs.includes(i) ? 1 : 0)));
  pkoLeaderIdx = pkoNextOpener(winnerIdxs);
  ...
}
```

| Consequence | Resolution |
|---|---|
| Next Clash opener when >1 scored | Most total Match points, then random (brief § 5) — `pkoNextOpener()` |
| >1 player crosses `pkoClashTarget` on the same Clash | They win jointly (brief § 4: "they all win together") |
| `screen-pko-hierarchy` | Joint Apex Predator — equal points share rank 1, no arbitrary ordering |
| `pkoClashHistory` rows | May contain multiple `1`s; the Hierarchy grid already renders per-cell |
| Existing call sites | **Exactly one** — `pkoAfterBoardChange` (`pko.js:1146`), which becomes `pkoResolveClash([playerIdx])`. Extinction's `onFire` adds the only new one. Also update the signature in `docs/code-map.md:1740` and `new-game-tech-pecking-order.md:234` |
| `tools/verify-pko-loop.js` | Its scoring checks assume a single winner — **must be rewritten**, not extended |

**An Extinction Event can end a Clash before a card is played.** Events fire before the Leader Stakes,
so a wipe that empties someone resolves the Clash immediately from an empty board. Intended.

---

## §7 — Validation Rules

### 7.1 The Mimic — one rule covering three mechanics

> **A play containing a Mimic must also contain at least one real card of the species being claimed.**

This generalises the brief's "cannot be played alone" and makes the claim **inferable** — no claim UI.

| Play | Legal | Illegal |
|---|---|---|
| Stake | `🐭🐭🎭` | `🎭`, `🎭🎭` |
| Stampede pad | `🐭🐭🎭` | `🎭🎭🎭` |
| Swarm slot | `🐭🎭` on a Mouse-Mark | `🎭🎭` on any Mark |
| Single answer | — | `🎭` alone (zero real cards) |

**Mimics resolve to the claimed species at play time and never reach the board.** The host substitutes
the id, so `pkoMarks` stays a flat array of real species ids and `pkoBeats()` needs **no changes at all**.

```js
// Returns { ok, claim, resolved } for one species-group. The ONLY place a Mimic is interpreted.
function pkoResolveGroup(cards) {
  const real = cards.filter(c => c !== PKO_MIMIC_ID);
  if (!real.length) return { ok: false };                       // never solo, never all-Mimic
  if (new Set(real).size !== 1) return { ok: false };           // one claimed species only
  const claim = real[0];
  if (claim === PKO_POACHER_ID) return { ok: false };           // Mimics cannot copy a Poacher
  return { ok: true, claim, resolved: cards.map(() => claim) };
}
```

> ⚠️ **The classic bug site.** Appliers need **both** arrays: `played` (raw ids, including `'mimic'`)
> for `pkoHoldsAll()` and `pkoRemoveFromHoard()`, and `resolved` for `pkoMarks`. Removing the resolved
> ids would delete cards the player never held. Cover this explicitly in the harness.

Three "Mimic cannot copy a Poacher" enforcement points fall out for free: Stake already bans Poachers;
`pkoResolveGroup` rejects a Poacher claim; and a 2-card `[poacher, mimic]` Swarm fails because neither
resolves to the Mark's species.

### 7.2 The Great Reversal

Both derived maps already exist (`pko.js:63–68`). Reversal reads the *other* one — zero new data:

```js
function pkoPredators(markId) {
  const rev  = pkoEventFlag('reversal');
  const wide = pkoAppetite === 'ravenous';
  const map  = rev ? (wide ? pkoBeatsWideMap : pkoBeatsMap)      // prey set becomes predator set
                   : (wide ? pkoBeatenByWide : pkoBeatenByMap);
  return map[markId];
}
```

Reversal composes with Appetite rather than overriding it — four graphs, all pre-built. The Poacher is
unaffected because it is tested **before** `pkoPredators()` in `pkoBeats()` (`pko.js:138`); the Mimic is
unaffected because it is never on the board. Both brief rules are already true.

Apex/dead-end inversion (Eagle becomes beatable, Elephant becomes weakest) is **intended chaos** —
brief § 7 flags it explicitly. Do not "fix" it.

### 7.3 Track lock (The Deluge / The Dry Season)

```js
function pkoTrackOk(id) {
  const lock = pkoEventFlag('track');                    // 'sea' | 'land' | null
  if (!lock) return true;
  if (id === PKO_POACHER_ID) return true;                // unaffected
  return ((pkoChain[id] || {}).track === lock);
}
```

Applied to **resolved** ids, so a Mimic inherits its claim's track automatically.

**Playability predicate — one definition, two consumers** (`canFire()` and the Leader pass, which must
never disagree): a player can act under a track lock iff they hold ≥1 card of the locked track **or**
≥1 Poacher. A Mimic alone does **not** qualify — it needs a real anchor of the claimed species.

| Brief fallback | Status |
|---|---|
| Leader can't open → Stake passes clockwise to the first player who can | ✅ **Kept.** Walk from `pkoLeaderIdx` in `pkoStartEncounter()`, set `pkoTurnIdx`. Does **not** transfer leadership — the next Encounter's leader is still the Unchallenged winner. |
| Nobody can play → skip Encounter, redraw event, revert leader | ❌ **Structurally impossible.** `canFire()` gates at draw time, so a track lock nobody can satisfy is never selected. No skip, no redraw, no loop, no cap. |

A player who cannot answer the *current* board Retreats manually. **No auto-Retreat** — "can't answer"
is not a stable property (the Marks change species on every board change), and auto-Retreating would
entangle `pkoCheckEncounterEnd()`'s termination proof. Instead the Challenge button shows **disabled
with the reason** — `"The Deluge — only the sea may hunt"` — following the BUG-04 precedent that PKO
surfaces why a play is illegal rather than presenting a dead button.

### 7.4 Alpha

**Designated on the opening Stake, not at Encounter start** — at Encounter start the board is empty, so
the brief's wording has no referent. One random index of the first board. (§17 D29.)

On a successful Challenge while `pkoAlphaIdx >= 0`:

1. The Alpha Mark is **excluded from the discard** — `pkoDiscardBoard(exceptIdx)`.
2. New board = all played (resolved) cards **plus** the survived Alpha.
3. `pkoAlphaIdx` reassigns to a random index of the **new** board, including the survivor.
4. Broadcast in `PKO_BOARD`.

**Swarming the Alpha grows the board by 2** — all three cards stay. No special case: Alpha's rule is
"nothing played against the Alpha is discarded" and Swarm's is "each card becomes its own Mark". Both
already hold. Compounding is Alpha's stated purpose. (§17 D30.)

**Stampede wipes the Alpha** — brief § 7's existing ruling; a Stampede replaces the board wholesale.
`pkoApplyStampede` calls `pkoDiscardBoard()` with no exception and resets `pkoAlphaIdx = -1`.

### 7.5 Carrion

**Ordering is already correct in shipped code and must not be reversed.** `pkoAfterBoardChange()`
(`pko.js:1146`) checks the empty Hoard and calls `pkoResolveClash` **before** the board resolves.
Carrion is a branch *below* that line, so a hand-emptying Challenge wins and Carrion is never offered.
This is the brief's "Carrion can un-win a Clash" issue, resolved by placement rather than a new rule.

Spoils = the Marks that were **actually beaten and discarded**. A survived Alpha is not spoils (it was
not beaten).

**The window resolves the selection, it does not cancel it.** Tap Marks to toggle them into the keep
set; "Take these" resolves early; **on expiry whatever is selected is kept and the rest discarded**.
Selecting nothing — including doing nothing at all — discards everything, which is exactly the shipped
non-Carrion behaviour. A slow player is therefore never punished, only unlucky, and a player who taps
two cards and freezes still gets those two.

**Race guard (ML-05):** the host resolves on the Challenger's `PKO_CARRION` packet **or** its own timer,
whichever lands first, and **drops the second**. A client's ACTION can legitimately arrive after the
phase closed. Host-as-participant: when the Challenger is the host, mutate directly and broadcast —
never a self-sent ACTION (the dedup guard drops `originId === syllyDeviceUid`).

### 7.6 The Culling — tie resolution

Discard your fewest-held species. Ties resolve **host-side** by lowest `PKO_PREY_RANK` (the table Small
Fry already uses), then random. No player choice, no ACTION, no readyCheck — The Culling stays a pure
interstitial. (§17 D28.)

Holding exactly one species discards nothing, so The Culling can never empty a Hoard (§6).

---

## §8 — The Event Registry

`PKO_EVENTS` — a const array of plain data objects. Mutating events own an `onFire`; passive events set
a flag an existing seam reads. `pkoEventFlag(key)` returns the active event's value for `key`, or the
falsy default when `pkoEvent` is null.

| # | id | Name | Emoji | Kind | Mechanism |
|---|---|---|---|---|---|
| — | `invasive-mimicry` | Invasive Mimicry | 🎭 | fixed opener | Fires in `pkoStartClash()` — §9 |
| 1 | `culling` | The Culling | 🍂 | `onFire` | Each player discards their fewest-held species |
| 2 | `great-reversal` | The Great Reversal | 🔄 | `reversal:true` | §7.2 |
| 3 | `deluge` | The Deluge | 🌊 | `track:'sea'` + `canFire` | §7.3 |
| 4 | `dry-season` | The Dry Season | ☀️ | `track:'land'` + `canFire` | §7.3 |
| 5 | `extinction` | Extinction Event | ☄️ | `onFire` + `canFire` | Wipes the globally rarest species; once per Clash |
| 6 | `migration` | Migration | 🧭 | `onFire` | Rotate every Hoard one seat left |
| 7 | `alpha` | Alpha | 👑 | `alpha:true` | §7.4 |
| 8 | `carrion` | Carrion | 🦅 | `carrion:true` | §7.5 |

```js
{ id:'deluge', name:'The Deluge', emoji:'🌊', blurb:'Only the sea may hunt.',
  canFire: () => pkoHoards.some(h => pkoCanActUnderTrack(h, 'sea')),
  onFire:  null,
  track:'sea', reversal:false, alpha:false, carrion:false }
```

### Drawing — gate, never redraw

```js
function pkoDrawEvent() {
  const pool = PKO_EVENTS.filter(e =>
       e.id !== 'invasive-mimicry'
    && !(e.id === 'extinction' && pkoEventsFired.includes('extinction'))
    && (!e.canFire || e.canFire()));
  pkoEvent = pool.length ? pool[Math.floor(Math.random() * pool.length)].id : null;
  if (pkoEvent) pkoEventsFired.push(pkoEvent);
}
```

`canFire()` is evaluated against host state *before* the event is committed. This is what deletes the
Deluge/Dry Season skip loop (§7.3) and Extinction's re-fire. `pkoEvent = null` (no eligible event) is a
legal outcome — the Encounter simply runs under standard rules with no interstitial.

### Mutating events

| Event | `onFire()` | Hoard sync |
|---|---|---|
| The Culling | Per player: find fewest-held species (ties → §7.6), splice all copies, batch into the Watering Hole | `pkoSyncAllHands()` |
| Extinction Event | Count every species across **all** Hoards combined; wipe the minimum. **All tied species are wiped.** Collect emptied seats → `pkoResolveClash(emptied)` and **return** | `pkoSyncAllHands()` |
| Migration | `newHoards[(i + 1) % n] = pkoHoards[i]` — each Hoard moves one seat clockwise (the player on your left) | `pkoSyncAllHands()` |

Discards go to the Watering Hole through `pkoDiscardBoard`'s batch shape, one record per event, so the
Discards tab stays grouped by the play that spent the cards.

**Trail entries:** turn-order per-player lines for Culling and Extinction ("Ava was Culled — lost 🐘"),
one line for Migration ("All Hoards migrated one seat left"), one line naming the event at the head of
every Encounter.

---

## §9 — Invasive Mimicry

Fires in **`pkoStartClash()`**, not `pkoStartEncounter()` — players must see their full Hoard on the
deal screen. It is *displayed* as Encounter 1's event, but the mutation happens before `PKO_CLASH_BEGIN`.

Order matters, and matches the brief exactly:

1. Build the Pool — Mimics excluded by `force_of_nature_only` (`pko.js:188`).
2. Deal `pkoHoardSize` to each player. **The base deal is Mimic-free.**
3. Push `2n` Mimics into `pkoReserve`, shuffle.
4. Each player draws `PKO_FON_DEAL_BONUS` from the (now Mimic-rich) Reserve.

`PKO_FON_DEAL_BONUS = Math.round(pkoHoardSize / 4)`:

| Hoard Size | Base | Bonus | Total |
|---|---|---|---|
| 10 | 10 | 3 | 13 |
| 12 *(default)* | 12 | 3 | **15** |
| 15 | 15 | 4 | 19 |

The brief's flat `+5` was written against a 20-card Hoard and would be a 42% boost against today's 12.
Scaling holds it at ~25% across all three settings. (§17 D25.)

Hoards are **not** refilled between Encounters — the bonus is once per Clash.

---

## §10 — Data

`data/pko-data.json` gains its **15th entry**. It does not currently exist.

```json
{ "id": "mimic", "name": "Mimic", "emoji": "🎭", "track": "wild",
  "beaten_by": [], "reach_beaten_by": [], "copy_formula": "2n",
  "force_of_nature_only": true }
```

`beaten_by` is empty and never consulted — a Mimic resolves to its claimed species before it can ever
become a Mark (§7.1). The field exists for schema uniformity only.

**Copy-count asymmetry is deliberate and now symmetrical:** the Poacher is **solo-only** (n copies);
the Mimic is **never solo** (2n copies). Exact opposites. This closes the brief's "confirm the
asymmetry is deliberate" item. (§17 D32.)

`PKO_PREY_RANK` is **not** extended — a Mimic is never a ranked animal, so Small Fry ignores it, which
is correct: a Hoard of Mimics plus one Mouse must open with the Mouse.

---

## §11 — Multiplayer

**No settings work.** `pkoSyllyMode` is already serialised and applied.

### Payload additions

| Packet | Direction | Added fields |
|---|---|---|
| `PKO_CLASH_BEGIN` | SYNC | `event`, `eventsFired: []` — **accumulator at reset value** (ML-03) |
| `PKO_ENCOUNTER_BEGIN` | SYNC | `event`, `eventsFired`, `alphaIdx`, `hoardCounts` (already present — now also reflects `onFire` mutations) |
| `PKO_BOARD` | SYNC | `alphaIdx` |
| `PKO_CLASH_END` / `PKO_MATCH_END` | SYNC | `winnerIdxs[]` replaces `winnerIdx` |
| `PKO_CARRION` | **ACTION (new)** | `{ keep: [markIdx…] }` |
| `PKO_HAND_SYNC` | private | unchanged shape; **new senders** — Culling, Extinction, Migration |

### The refactor that makes this safe

`pkoRemoveFromHoard()` currently owns the private repair packet (`pko.js:1106–1115`). Three mutating
events change Hoards **without removing a played card**, so the send must be extracted:

```js
function pkoSyncHand(playerIdx) { /* the mpSendPrivate PKO_HAND_SYNC block, lifted verbatim */ }
function pkoSyncAllHands()      { for (let i = 0; i < pkoPlayerCount; i++) pkoSyncHand(i); }
```

`pkoRemoveFromHoard()` then calls `pkoSyncHand(playerIdx)`. This is `logic-engine.md`'s ML-06 rule
applied correctly — the send lives in *the* function where a Hoard changes, so any future mutating
event inherits it for free. **BUG-02 was exactly this class of bug** and the whole-collection (never a
delta) shape must be preserved.

### Missing-handler audit

| Phase | Can a non-host device submit? | Handler |
|---|---|---|
| Event interstitial | No — auto-advance, both sides time locally off one SYNC | none needed |
| Carrion window | **Yes** | `PKO_CARRION` — **new**, plus host-as-participant direct branch |
| All other FoN phases | No — `onFire` is host-only on an empty board | none needed |

One new handler. The interstitial needs no packet: after it, the table renders from already-synced
state, so no host decision is pending and both sides can run their own `PKO_EVENT_SCREEN_MS` timer off
`PKO_ENCOUNTER_BEGIN`. (This differs from `screen-pko-unchallenged`, where only the host schedules,
because there the advance *starts the next Encounter* — a host decision.)

---

## §12 — Overlays

| Overlay | Pattern | z | Notes |
|---|---|---|---|
| `pko-carrion-overlay` | Decision modal | z-[90] | **NEW.** "🦅 Carrion — take the spoils?" Beaten Marks as tappable cards, countdown bar, "Take these" / implicit discard on expiry. Border `border-[#C9A227]` matching `pko-quit-overlay`. **Add to `resetToLobby()` teardown.** |
| `pko-chain-overlay` | Data | z-[90] | Add the Mimic to the reference, with the one-rule statement from §7.1 |
| `pko-how-to-overlay` | Data | z-[90] | Rewrite the `✨ Sylly Mode` card (last card) — name, the 9 events, the Mimic rule |

---

## §13 — Audio

No new synthesised functions. Reuse per event:

| Event | Sound |
|---|---|
| Extinction Event, The Culling | `playAbyssThud()` — the heaviest sound in the catalogue |
| The Great Reversal, Migration | `playWhoosh()` |
| Alpha designated / reassigned | `playSonarPing()` |
| Carrion spoils taken | `playSuccess()` |
| Deluge / Dry Season / no event | `playDone()` |

---

## §14 — Art & PWA

| Asset | Requirement |
|---|---|
| Mimic card face | 360 px JPEG, **≤ 40 KB** (PWA Guardian ceiling, elevated from TG-02) |
| `data/art/pko/pack.json` | Add the `mimic` entry |
| `sw.js` | Add the image to `PRECACHE_URLS`; bump `CACHE_NAME` **v148 → v149** |
| Event interstitial art | **Emoji only** — no bitmaps. 8 events × art is not worth the install weight |
| Alpha indicator | CSS crown + glow overlay, not art. `pkoRenderCard(id, { alpha:true })` — the opt is documented as reserved but **not yet implemented** |

Core art is precached and *is* part of the app version — hence the SW bump. This is the opposite
contract to `data/packs/` cartridges.

---

## §15 — Verification

**New harness: `tools/verify-pko-events.js`.** A third file, not an extension of the other two — the
loop harness is already 123 checks and mixing event rules into it obscures both.

| Check group | Must prove |
|---|---|
| Reversal | Involution under **both** Appetites (4 graphs); Eagle beatable when reversed; Poacher unaffected |
| Mimic | `pkoResolveGroup` rejects solo/all-Mimic/mixed-real/Poacher-claim; **removal uses raw ids, board uses resolved ids** |
| Track lock | Playability predicate identical between `canFire()` and the Leader pass; Poacher qualifies, lone Mimic does not |
| Culling | Never empties a Hoard, at every Hoard composition; tie → lowest `PKO_PREY_RANK` |
| Extinction | Once per Clash; all tied species wiped; multi-seat emptying resolves as joint scorers |
| Migration | Total card count conserved; each Hoard lands one seat clockwise |
| Alpha | Board grows by 1 on a normal beat, by 2 on a Swarm; Stampede wipes it; reassignment stays in range |
| Carrion | Never offered on a hand-emptying Challenge; a survived Alpha is not spoils |
| Draw gate | An ineligible event is never selected; `pkoEvent = null` is handled |

**Rewrite required:** `tools/verify-pko-loop.js` scoring checks assume a single Clash winner (§6).

> **TG-07 still binds.** A single-process harness runs in `'single'` mode where `pkoMyHoard` *aliases*
> `pkoHoards[0]`, so it is structurally blind to per-device mirror bugs — which is how BUG-02 survived
> 75 green checks. The Mimic raw-vs-resolved removal and the three new `pkoSyncAllHands()` senders are
> exactly that class. **The first playtest action must be a non-host player taking a turn.**

---

## §16 — Implementation Order

Each step ends green. Do not proceed on a red harness.

1. `data/pko-data.json` Mimic entry + art + `sw.js` v149 → `verify-pko-chain.js` still 58/58
2. Extract `pkoSyncHand` / `pkoSyncAllHands`; `pkoResolveClash(winnerIdxs[])` + `pkoNextOpener` +
   Hierarchy joint winners → rewrite loop-harness scoring, back to green
3. `PKO_EVENTS` registry + `pkoEvent`/`pkoEventsFired` + `pkoDrawEvent` + `screen-pko-event`
   (→ `allScreens[]`) + interstitial timer → new harness, draw-gate group
4. Passive events: Great Reversal (§7.2), track locks (§7.3) + Leader pass + disabled-reason label
5. Mutating events: Culling, Extinction, Migration (§8)
6. Invasive Mimicry (§9) + `pkoResolveGroup` wired into all three appliers (§7.1)
7. Alpha (§7.4) — `pkoDiscardBoard(exceptIdx)`, `opts.alpha` rendering
8. Carrion (§7.5) — overlay, `PKO_CARRION`, race guard, `resetToLobby()` teardown
9. Copy: settings card, how-to Sylly card, chain overlay Mimic entry, `ui-style.md` footnote ‡ removal
10. Three-device playtest — **non-host player moves first**

---

## §17 — Decisions (for `decision-log.md` / impl-notes)

| # | Decision | Rationale |
|---|---|---|
| D25 | Invasive Mimicry bonus scales — `round(pkoHoardSize / 4)` | Brief's flat +5 assumed a 20-card Hoard; 42% against today's 12 |
| D26 | **Dark Forest cut** — 8 random events, not 9 | Brief itself invited this: highest MP cost in the design (Marks off the public channel, redacted Trail views) for concealment the host can't actually provide |
| D27 | Extinction scores; The Culling can't — **not** an inconsistency | Culling always leaves ≥1 card by construction. One rule, one mechanic can't reach it |
| D28 | Culling ties auto-resolve host-side | Keeps every event a pure interstitial; the agency was thin (tied = same tiny count) |
| D29 | Alpha designated on the **opening Stake** | Brief says "at Encounter start", when the board is empty — no referent |
| D30 | Swarming the Alpha grows the board by 2 | Both existing rules already say so; compounding is Alpha's purpose |
| D31 | Carrion is a **timed per-card** window, 5 s | Owner's design — bounded wait, full agency, default = shipped behaviour. 5 s not 2.5 s because 2.5 s is the game's *reading* budget and Carrion asks a player to read **and act**. First playtest dial |
| D32 | Mimic never solo / Poacher always solo | Makes the copy-count asymmetry a deliberate mirror, and makes the Mimic claim inferable — no claim UI |
| D33 | Mimics resolve to the claimed species at play time | `pkoMarks` stays flat; `pkoBeats()` unchanged; only 3 sites learn Mimic exists |
| D34 | `canFire()` gates the draw; events are never redrawn | Deletes the Deluge/Dry Season skip loop rather than capping it |

---

## §18 — Deviations from the Phase 1 Brief

| Brief § 7 | This spec | Why |
|---|---|---|
| 9 random events incl. Dark Forest | 8, Dark Forest cut | D26 |
| Full-screen all-confirm event screen | 2.5 s auto-advance interstitial | The brief's own review note flags ~30 taps/Clash at 6 players |
| Culling ties → player chooses | Host auto-resolves | D28 |
| Carrion → untimed per-card choice | 5 s timed window | D31 |
| Invasive Mimicry `+5` | `round(pkoHoardSize / 4)` | D25 |
| Deluge/Dry Season skip + revert | Never reachable | D34 |
| Mimic × Swarm | Undefined (Swarm postdates the brief) | D32 — resolved here |
| Great Reversal × Appetite | Undefined (Appetite postdates the brief) | Composes; four pre-built graphs |
| Extinction × Swarm fuel | Undefined | **No interaction by construction** — Mouse/Fish are 4n, the most abundant; both events select on *fewest* copies |

---

## §19 — Doc Closure (Documentation Integrity Protocol)

1. `docs/code-map.md` — `screen-pko-event`, `pko-carrion-overlay`, `PKO_EVENTS`, the four new state vars
2. `docs/rules/game-identities.md` § Game 17 — replace the "Phase 2 design record" paragraph with the
   shipped ruleset; add Mimic to the chain table; add FoN vocabulary
3. `CLAUDE.md` — SW v149, Current Focus
4. `.claude/rules/logic-engine.md` — SW v149; `ui-style.md` Table B footnote ‡ removed
5. `docs/implementation-notes/pko-implementation-notes.md` — D25–D34
6. `docs/decision-log.md` — one line: Dark Forest cut + multi-scorer Clash resolution
7. `docs/sw-changelog.md` — v149 notes
