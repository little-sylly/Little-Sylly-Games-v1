# Implementation Notes — Honeycomb Hills (`comb`, game 20)

Spec: `docs/new-game-tech-honeycomb-hills.md` (CONFIRMED 6 Sep 2026) — that document is the source
of truth, not the Phase 1 brief. Build order is Protocol B skeleton-first, five steps; the header of
`js/games/comb.js` carries the step map.

---

## Design Decisions

**DD-01 — The Instinct deck button and the placement Cancel are NOT pills (Step 3, 7 Sep 2026).**
Both were first authored as `class="pill shrink-0"` because they sit in a row and read like pills.
They are not. `.pill` is `flex: 1` with `padding: 0.5rem 0` — **zero** horizontal padding
(`css/styles.css:59`) — because it is the multi-choice *settings row* class and every structural
value in it assumes a row of siblings dividing one width between them. Standing alone, the Instinct
button grew to fill the whole hand row and lost its side padding entirely. `shrink-0` does not help:
it cancels `flex-shrink`, never `flex-grow`. Both are now neutral stone buttons matching End Turn's
shape (`min-h-11 px-3 rounded-xl bg-stone-200 …`). See **TG-01**.

**DD-02 — `combOpenHowTo` owns the tab switch from Step 3, the deep-link from Step 5.** The tab half
is pure display toggling over sibling bodies and needs no game state, so it was worth settling while
the markup was fresh; `refHighlightRow` needs gallery rows to ring and those do not exist until the
seams do. The function's contract is already the final one — `(tab, highlightId)`, with a
`highlightId` forcing its tab — so no call site changes when the second half lands.

**DD-03 — the tie rule is implemented twice, on purpose (Step 5, 7 Sep 2026).**
`combResolveHolder()` guards Q18's "ties never transfer" with **two** independent checks: the
`scores[holder] === best` early return, and `leaders.length === 1` on the transfer. Either alone is
correct. A mutation run proved no *single* edit to either changes any answer — which is exactly why
the redundancy is worth keeping and why a comment now says so at the site. Deleting the first line
is harmless on its own; deleting it *and* later slipping `===` to `>=` on the second hands the card
to the lowest-numbered leader on every tie, silently. See **BUG-02**.

**DD-04 — the Trade Blossom node pairs are derived, not enumerated.** Spec §10 fixes the count (4
generic 3:1, 5 specific 2:1), says the set is part of the topology and never shuffles, but never
lists the pairs. `combBuildPorts()` therefore walks the rim cycle — coastal nodes are those touching
fewer than 3 hexes, 30 of them — and takes an adjacent pair every 3 nodes. Deterministic and stable,
which is all the packet layer requires. If the owner wants specific pairs for art reasons, replacing
the walk with a literal array is a one-line change and the harness assertions still hold.

---

**DD-05 — Daylight is armed on entering `actions`, not at turn begin, and it took a new packet
(Step 5 chunk 3, 7 Sep 2026).** Spec §11's packet table puts `endTimestamp` in `COMB_TURN_BEGIN`.
Built that way, three other people's Overflow taps eat the active player's clock: on a 7 the turn
opens in `roll`, detours through `overflow` (everyone else's taps) and `waspMove`, and only then
reaches the phase the clock is meant to be pressuring. `logic-engine.md` § Host-gate screens before
timed phases settles it the other way and is the older rule — *"the host computes `endTimestamp` at
the moment they click through the gate, not at queue-build time earlier in the flow"*. So
`COMB_TURN_BEGIN` now carries `endTimestamp: 0` and a new SYNC, **`COMB_ACTIONS_BEGIN`**, carries
the real one. The alternative was folding the field into all three packets that reach `actions`
(`COMB_ROLL_RESULT`, `COMB_OVERFLOW_DONE`, `COMB_WASP_PLACED`) — three places to forget it, against
the single-source rule. Spec §11's packet table gains one row.

**DD-06 — the opening wall takes an anchor, not a blanket exemption (Step 5 chunk 3).**
`combWallLegal`'s draft branch was `if (opts.free && opts.draft) return { ok: true }` — any empty
edge on the board. That lets an opening wall land nowhere near the cell it belongs to and seed a
second, disconnected network the player never has to reach. §7 lists the draft exemption for the
**cell** only; the wall's connectivity was never exempted, and Catan's rule is that the opening road
touches the settlement just placed. `combDraftOpts()` now passes `anchor` (the cell of this step),
and the branch requires the edge to touch it. **The anchor doubles as the sub-step**: `combDraftNeeds()`
is `combDraftAnchor >= 0 ? 'wall' : 'cell'`, so there is no second variable that can disagree with
the first about which piece is owed. It is match state and it serialises — a late joiner mid-step
needs it.

**DD-07 — three rules the spec does not name, decided to Catan (Step 5 chunk 3).** Each is logged
because a later reader will otherwise assume it was arbitrary:
- **The second draft cell pays out.** §10 names the snake and stops. Without the payout every seat
  opens empty and the first lap is N dead turns — the rule exists precisely to stop that.
- **Limited Bounty's shortage rule.** When the Meadow cannot pay everyone owed a resource, nobody
  gets that resource unless exactly one player is owed, who takes what is left. Any other reading
  needs a rule for who goes short, and there isn't one. `COMB_SUPPLY_EACH = 19`, Catan's count.
  Spent resources return to the Meadow via `combReturnToSupply()`, called from `combApplyPlace`'s
  cost deduction and the Overflow — without it Limited drains to empty over a match and quietly
  stops paying anybody.
- **The Wasp's draw is over holdings, not kinds.** Someone sitting on four Wax and one Nectar loses
  Wax four times as often. That asymmetry is the whole reason hoarding one resource is risky.

**DD-08 — the Scout Flight is automatic, so no cast button exists (Step 5 chunk 3).** §2 makes the
flight animation the turn's opening beat (800–1200 ms, tap to skip) rather than a decision, and §11
puts the roll on the host *"for whoever is active"*. Those two together mean a client's device never
has to ask: `combBeginTurn` arms a `setTimeout` on the authority only, and `COMB_ROLL` stays in the
packet table as chunk 4's skip-the-animation nudge rather than as the mechanism. This is why
`comb-action-bar` has four buttons and none of them is Roll — that is not an omission.

**DD-09 — the host trusts the WIRE's `originId` for who acted, never the payload's `playerIdx`
(Step 5 chunk 4, 7 Sep 2026).** Spec §11's ACTION table gives every packet a `playerIdx`, and the
obvious reading is that the host applies it. It must not: a device that put somebody else's seat in
that field would place their pieces and spend their hand, and nothing anywhere would notice.
`combSeatOf(env.originId)` resolves the sender against `mpPlayerSlots` instead; `-1` (not a seated
player) drops the envelope. `playerIdx` still travels because the spec says so and because it reads
well in a log — it is simply not authoritative. The suite has no precedent either way, which is why
this is written down: **every other MDLM game trusts the payload.** None of them has a private hand
whose contents an impersonation could spend, so the exposure differs; the rule is still cheap enough
that a new game should copy it.

**DD-10 — a rejected ACTION answers with a private `COMB_FULL_STATE`, which is also the packet's only
live send site in v1 (Step 5 chunk 4).** Spec §11 lists `COMB_FULL_STATE` for "late join into the
draft; the reconnect path when it is built", and §17-12 defers reconnect — so the packet would have
shipped with an applier and no sender, which is dead code. It has a real job already: an ACTION the
host rejects produces **no SYNC at all**, so the submitting device sits on a stale board with a dead
button and no way to learn why. Repairing that one device costs six lines, uses the strip the spec
already required, and means the applier is exercised on every run of the loopback rather than being
written on trust. It is also, unchanged, the late-join path when that lands.

**DD-11 — `combBuild()` exists because `COMB_BOARD_UPDATE` had no send site.** The draft broadcasts
`COMB_DRAFT_STATE` and the Wasp broadcasts `COMB_WASP_PLACED`, but a build made during `actions` went
straight through `combApplyPlace` and told nobody — the packet was in spec §11's table with nothing
producing it. Splitting the non-draft build out gives the `COMB_BUILD` ACTION exactly one applier to
call, so a client's build and the host's own tap cannot diverge. The win check deliberately stays in
`combEndTurn`: §6 allows checking after any own-turn action, but a player who builds to the target
must end their turn anyway (or Daylight ends it for them), so nothing is lost and there is one
fewer place for the rule to live.

**DD-12 — the two-step build picker is INLINE, not a sixteenth overlay (Step 5 chunk 5, 8 Sep 2026).**
Spec §8 fixes the overlay registry at fifteen and §17-4 says the pickers are overlays, so the obvious
reading was to add one. It is the wrong reading here, and the spec itself says why two sections
earlier: *"the board never goes away, so everything else is a layer over it"* — but step 1 of a build
is the one decision a player makes **while reading the board**. What is affordable is a fact about
your hand; where it can legally go is a fact about the board, and an overlay covering the board while
you weigh the two is exactly the move `screen-comb-meadow`'s whole `h-screen` exception exists to
prevent. `#comb-build-picker` is therefore a third sibling in the Controls zone alongside
`#comb-place-bar` and `#comb-action-bar`, with exactly one of the three ever shown. It costs no
z-index entry, no `resetToLobby()` teardown line and no fifteen-to-sixteen change to §8. Measured at
390 px: three 114 px options on one row, labels unwrapped, nothing overflowing.

**DD-13 — a directed offer resolves on the accept; only an OPEN offer reaches
`COMB_TRADE_SELECT` (Step 5 chunk 5).** Spec §11 lists `COMB_TRADE_POST`, `COMB_TRADE_RESPOND` and
`COMB_TRADE_SELECT` without saying when the third is reached, and §5's Waggle Dance setting describes
the two *modes* rather than the two *shapes*. The shape that matters is the offer's `to` field, not
the setting: **`to >= 0`** was sorted out loud with one person, so their accept **is** the deal and a
select step would be a second tap containing no decision; **`to === -1`** was posted to the table, so
the answers accumulate and the poster picks among whoever said yes. That is the only thing
`COMB_TRADE_SELECT` is for, and reading it off `to` rather than off `combWaggle` means the Out Loud
setting is free to offer the table option too without a second code path. The 10 s auto-decline is
the part that really is setting-driven, and it is Full Dance only.

**DD-14 — an expired Full Dance that somebody accepted SURVIVES its own deadline.** The obvious
implementation kills the offer when the clock runs out. But the deadline exists for **one silent
player stalling three others**, not for the poster's choice — and killing an offer the moment a
second seat has said yes would punish the poster for a third seat's silence. So expiry records every
unanswered seat as a decline and then asks whether anybody accepted: if nobody did, the offer is
abandoned with *"Nobody took the dance."*; if somebody did, the offer stays open with a now-complete
set of answers and `expiresAt` cleared. `combEndTurn`'s refusal and Daylight's `combClearOffer()`
between them mean it cannot outlive the turn either way.

**DD-15 — Comb Rush is a counter the build applier spends, not two forced placements.**
"Build two Comb Walls free, immediately" reads like a two-step placement mode, and implementing it
that way strands a player who has nowhere legal to put the second one. `combFreeWalls` is a plain
integer instead: `combBuild()` passes `{ free: true }` and decrements while it is above zero, and
`combBeginTurn()` drops whatever is left. Two consequences worth stating. It is **authoritative
state** — nothing on the board and nothing in a hand says two free walls are owed — so it is in
`combSerialiseState()` and has its own key-set assertion. And the spend lives in `combBuild()` rather
than in `combApplyPlace()`, which keeps the placement applier ignorant of Instinct cards and keeps
"free" out of the draft path, which has its own separate exemption.

**DD-16 — the win check stays in `combEndTurn` alone, extended to the action layer.** §6 says to
check after every build, every Instinct play and every achievement transfer on the active player's
own turn. DD-11 already narrowed that to `combEndTurn` for builds; chunk 5 keeps the narrowing for
Guard Bee's Fiercest Guard transfer and for a Golden Nectar drawn on your own turn. The argument is
unchanged and now covers more ground: a player who reaches the target must end their turn anyway, or
Daylight ends it for them, and `combEndTurn` checks before it advances. One check site is one rule.

**DD-17 — the Season-preset trap (spec §5/§19) is closed structurally, not by discipline (Step 5
chunk 6, 9 Sep 2026).** The spec's own warning is that a pill handler which mutates
`combWasp`/`combOverflow` but repaints only its own card leaves the other two cards stale — visibly
wrong, invisible to every harness. Rather than trust each of the seven handlers to remember to call
the right repaint, all seven route through one `combBindSettingPill(group, fn)` and every one of them
calls the *comprehensive* `combSyncSettingsUI()` (all seven cards, unconditionally) after mutating
state — there is no per-card repaint variant to forget to use. The rule mutation itself is a separate
pure function, `combApplySeasonPreset(value)`, asserted directly in `verify-comb-rules.js` §12 (both
directions: Full Season sets and Short Summer un-sets the two partners; tapping either partner alone
leaves The Season untouched) — the DOM repaint is presentation and was instead proven with
`visual-check` (tap Full Season, read all three cards' active pill + value line back from the live
page). `mpSerialiseSettings`'s `case 'comb':` and its SETTINGS_SYNC applier (`js/engine-multiplayer.js`)
already existed ahead of this chunk; only the settings-overlay JS (`combSyncSettingsUI`, the seven pill
bindings) and the gameover podium were missing.

**DD-18 — the gameover podium reads `combGameover` only; it computes nothing.** `combFinishMatch()`
(host) and the `COMB_GAMEOVER` applier (every client) both fully populate `combGameover` —
`standings[]` pre-sorted by `truePoints` descending, `goldenNectar[]`, `stats`, both achievement
holders — before `combShowGameover()` is ever called, so the podium is pure rendering: medal slot
(`.comb-medal-slot`, already in `css/styles.css`, DD-30/ui-style.md pattern) + name + `truePoints`
with the Golden Nectar count named in parentheses when non-zero (the reveal spec §17 calls "the one
beat this screen must land"). `combLargestHolder`/`combFiercestHolder` at `-1` render as *"Unclaimed"*
per §6's tie-break rule, never a blank or a `-1` — verified via `visual-check`.

**DD-19 — COMB is the first game with a MULTI-KIND core art pack, and two per-file ceilings were
raised on purpose after measuring the real art (9 Sep 2026).** `js/lib/art.js` resolves exactly one
`kind` per manifest (`window.coreArt[kind]`), and every game so far has had exactly one kind. COMB's
four render seams + four extras use **nine** distinct kind strings, so the game needed nine separate
`data/art/<id>/pack.json` folders rather than the one-folder-per-game pattern every other core-art
game uses — `tools/convert-core-art.ps1`'s two-tier (card width / extra
width, JPEG-only) config has no way to express that, so `tools/convert-comb-art.ps1` is a new,
COMB-specific script rather than an edit to the shared one. Separately: `docs/art-authoring-guide.md`
§ Honeycomb Hills' pre-art ceilings (hero piece 14 KB, die 12 KB) were written before any art existed,
and the delivered wet-gloss/internally-glowing art — exactly what the generation prompts asked
for — does not fit a lossless PNG at those sizes without a size so small it visibly softens against
the die's 120–160 px render. Measured trade-off, not a guess: hero piece raised to **27 KB** (real
range 12–26 KB across all 12 at a box that still reads at ~90–100 px render), die raised to **26 KB**
(real ~22 KB at 100×100, vs 512×512 draw-at). Total precache landed at **842 KB**, ~82 KB above the
pre-art 760 KB estimate — same lesson as `cjar-impl-notes` TG-02b: measure the quality a cap forces
at the real render size, don't inherit a number from before the art existed.

**DD-20 — the nine packs were relocated under one `data/art/comb/` folder the same day, before any
of it shipped (9 Sep 2026, owner request).** DD-19's nine `data/art/<id>/` folders each sat directly
under `data/art/` alongside `pko/`, `flw/`, `frt/`, `shp/`, `cjar/` — correct per `art.js`'s one-kind-
per-manifest resolution, but nine flat `comb-*` folders read as nine games at a glance in a directory
listing. **The folder a manifest lives in and the `kind` string it resolves under are independent
facts** — `data/art/registry.json`'s entries and each manifest's own `id` field are what `artLoadCore()`
fetches by (`data/art/${id}/pack.json`), and neither is read anywhere near `assets.kind`, which is
what `combRenderHex`/`combRenderPiece`/etc. actually pass to `assetFace`/`assetBack`/`assetExtra`.
So the nine folders moved to `data/art/comb/<sub>/` (`hex`, `res`, `instinct`, `piece`, `piece-hero`,
`blossom`, `wasp`, `pog`, `die`), each manifest's `id` became `"comb/<sub>"`, the registry's nine
entries followed, `sw.js`'s 52 image paths + 9 manifest paths were rewritten, and
`tools/convert-comb-art.ps1` now writes there directly — **zero JS changes**, because `assets.kind`
(the only thing a render seam call site knows about) never moved. Re-verified with a real Playwright
browser: all nine `kind`s load, every `assetFace`/`assetBack`/`assetExtra` call resolves to the new
path, and every resolved URL fetches 200. `data/art/pending/comb/` (the 52 originals the conversion
was made from) is confirmed no longer needed in-repo and cleared to move to external backup — same
convention `convert-core-art.ps1`'s header already states for every other game's masters ("normally
kept out of the repo").

**DD-21 — the four gallery kinds gained tap-to-zoom, and three of them gained a dedicated LARGE size
(9 Sep 2026, owner review of the built How-to overlay).** Neither had shipped with DD-18/DD-19 —
found by the owner actually looking at the gallery, which none of the harnesses or the earlier
`visual-check` pass (which only checked geometry: rect sizes, overflow, real images present) would
surface, because both are matters of *legibility and consistency with the rest of the suite*, not
correctness.
1. **Tap-to-zoom.** `ui-style.md` § Pattern 2a says every gallery tile with real art gets
   `artMakeZoomable` — PKO/FLW/SHP/CJAR all do. COMB's four galleries (hexes, resources, Instinct
   cards, hero pieces) never got it; a new `combZoomable(el, url, caption)` wrapper (resolves the URL
   at the call site, per Pattern 2a's own rule, never inside the render seam) is now called from all
   four. **Deliberately not** added to the Costs card's repeated per-unit icons — one zoomable
   Resources row per kind is the reference; five taps on the same shard in one cost line would be
   noise, not reference.
2. **Size.** `.comb-res-icon`'s 0.8-0.9rem (12.8-14.4px) and `.comb-res-small`'s were sized for the
   *gameplay* surfaces (hand row, live cost previews) where several chips share one row with a
   build's label — exactly the constraint a reference list does NOT have. At that size the five
   resource shapes (the whole point of spec §10/§17-15's "distinct silhouette" rule) were
   indistinguishable. New CSS-only variants: `.comb-res-big` (2.75rem icon, `{ big: true }`) for the
   Resources card's one-per-kind rows, `.comb-res-cost` (1.5rem, `{ cost: true }`) for the Costs
   card's repeated icons (sized to keep Queen Dome's worst case — 5 icons — on one row before
   wrapping), and `.comb-piece-hero` bumped 5rem→6rem. Verified via `visual-check`: no row overflows
   sideways at 390px, Queen Dome's 5-icon row measured 312px wide (well inside the 342px card), hero
   pieces render at a true 96×96 box.
**Lesson:** a `visual-check` pass that only asserts geometry (no overflow, correct rect size, a real
image present) can still pass over "the reference is too small to read" and "this doesn't behave like
the rest of the suite" — both need someone to actually look, the way the offline install check's own
"illustrated cards = precached, emoji = it didn't" line already assumes a human is reading the result.

**DD-22 — the shared `#art-viewer-overlay` never scaled a small master UP, and COMB is the first game
small enough to expose it (9 Sep 2026, second owner review pass).** `.art-viewer-img` was
`width: auto; height: auto` with only `max-width`/`max-height` as ceilings — correct for shrinking an
oversized master (every other core-art game: PKO 360px, FLW 512px, CJAR 240px, all bigger than their
viewer box) but a `max-*` ceiling cannot make a source SMALLER than the box scale up to fill it.
COMB's board/gallery-sized masters (84×114 hex, 82×82 resource, 133×133 hero piece — all capped small
on purpose, DD-19, for a 30–100px on-screen render) opened at native pixel size: **smaller than the
gallery tile they were tapped from**, the opposite of what tapping-to-enlarge means. Fixed with one
rule: `width: 100%; height: auto;` (kept `max-height: 72vh` as the tall-image ceiling) — this is a
**shared, engine-owned element** (`ui-style.md` § Pattern 2a — six games open it), so the fix helps
every game whose master happens to be smaller than the viewer box, not just COMB, and does nothing
different for a master that was already larger (still shrinks to fit, same as before).
**Same pass, same root cause family — transparency and the missing hex label:**
- `.art-viewer-img` gained `background: #fafaf9`. COMB is the first game whose precached art has real
  alpha (PNG hex tiles, resources, pieces — the board tessellates hexes by their own alpha with no
  clip path, so JPEG was never an option, DD-19); every other game's viewer content is opaque, so a
  background colour behind the `<img>` was previously invisible and irrelevant. Without it, COMB's
  transparent corners showed the modal's `bg-black/80` backdrop through them — "floating on black",
  next to an Instinct card (opaque JPEG, no transparency) that never had the problem. Also
  engine-owned and harmless for every other game for the same reason.
- `.comb-hex-asset .comb-hex-emoji, .comb-hex-asset .comb-hex-name { display: none; }` was one rule
  written for the pre-art era, hiding BOTH the emoji fallback AND the name label whenever real art
  was present. Right for the emoji (redundant once art exists); wrong for the name — a hex tile is
  the ONE place its own name appears (an Instinct card's name already sits in the text beside it in
  every gallery row; a hex tile has no such sibling), and it carries no baked-in text by the suite's
  own "don't paint in text the game already draws" rule. With the label hidden, the Resources card's
  "from Sapling Grove" line pointed at nothing findable. Split the selector so only `.comb-hex-emoji`
  hides.
- The face-down Instinct back (added DD-18-era, next to the "Twenty-Five Cards" heading) was a static
  visual with no `combZoomable()` call — an oversight from when it was added, not a deliberate
  exclusion like the Costs card's repeated icons (DD-21). Wired the same as every card front.
**Lesson, generalising DD-21's:** a shared engine element tuned against five games whose masters were
all "big enough" silently carries an assumption (never needs to scale up; content is always opaque)
that only breaks once a sixth game's masters are smaller, or has real alpha. The fix belongs in the
shared element, not a COMB-local override, precisely because the assumption was never game-specific
to begin with — it just never got tested against a game the assumption was wrong for.

**DD-23 — DD-22's own fix made the resolution gap visible, and needed a resolution bump (not a CSS
bump) to actually close it (10 Sep 2026, third owner review pass).** Two related findings from
looking at the shipped gallery again:
1. **The hex tile's in-gallery presentation was messy.** `combRenderHex(kind)` was still passing its
   default `{ label: true }`, so the gallery showed the tile's own baked-in name overlay (a gradient
   scrim + text, DD-4's fallback-mode styling) stacked on top of a SEPARATE "Yields X" caption below
   it — two competing labels, one fighting the art for attention. Fixed on both ends: the call site
   now passes `{ label: false }` (no in-tile overlay, regardless of asset-vs-fallback state), and the
   one caption below combines name and yield into a single line, `**Sapling Grove** — Yields Resin`.
   The CSS carve-out DD-22 added (keep `.comb-hex-name` visible over real art) is reverted — with the
   gallery no longer relying on it, the original "hide the fallback's name+emoji once real art loads"
   default (matching `.comb-card-asset`'s own shape) is right again, and is the safer default for any
   future caller who doesn't know to reach for `{ label: false }`.
2. **The DD-19 resolution caps were sized for the wrong consumer, and DD-22 is what exposed it.**
   Hex/resource/hero-piece/die masters were sized against their small on-board/on-card render
   (30–100 px) — correct in isolation, but DD-22's `width: 100%` fix on the shared art viewer means
   these same masters now get stretched to fill a ~342–390 px box, a 3–4× upscale that reads as
   genuinely pixelated, not just "a bit soft". Re-measured against the VIEWER as the binding consumer
   this time (owner: KB/MB cost is not the constraint here) and re-converted at roughly 4× the
   original pixel dimensions — hex 84×114→340×460, resource 82×82→260×260, hero piece 133×133→280×280,
   die 100×100→260×260 — landing well inside the new, deliberately generous caps (see
   `art-authoring-guide.md` § Honeycomb Hills for the full table). Board pieces, Trade Blossoms, the
   Wasp and the pogs are untouched — none of them are ever shown through the art viewer or a how-to
   gallery, only drawn small on the canvas board, so their original sizing was never wrong.
**Lesson (extends DD-22's):** a cap tuned against "the largest consumer today" needs re-checking when
a LATER change adds a bigger consumer — DD-19 was right when written (no art viewer integration
existed yet for these four kinds), and became wrong the moment DD-22 wired one up, without anything
about the art itself changing. The dependency runs from the consumer to the cap, not the other way
round, so a consumer-side fix (DD-22) can silently invalidate an unrelated asset-side decision (DD-19)
made earlier — worth checking explicitly whenever a new way to view existing art is added, rather than
assuming the art's own sizing is settled once shipped.

---

**DD-24 — The Sun Compass needed a render seam and a RAF, and NO packet. (10 Sep 2026)**

The last piece of the build, and the surprising part is how little of it was network work.

1. **"Presentation of a decided result" is not a description, it is the load-bearing fact.** Brief
   Appendix B1 uses it to rule out three.js — there is nothing to simulate, the host has already
   chosen the face. The same sentence also rules out a packet: if the die only ever *shows* a number
   another device chose, then every field it needs is already in `COMB_ROLL_RESULT`. The animation
   rides the two packets that were there — `COMB_TURN_BEGIN` casts it, `COMB_ROLL_RESULT` lands
   it — so the loopback and the 19 packet mutants stayed valid without a line of harness plumbing.
   Worth reaching for deliberately: **ask what the animation needs to KNOW before designing what it
   needs to be SENT.**
2. **The blind spin is dead time that already existed.** `combArmScoutFlight`'s `setTimeout` had
   been sitting there since chunk 4 showing *nothing* on any device — a one-second pause the spec
   called "the turn's opening beat" that had never been given anything to play. The animation did not
   add a second to the turn; it filled the second the turn was already spending. The host's spin is
   that window; a client's is however far apart the two packets arrive, which is the same figure plus
   jitter, so the two devices land together without either of them being told to.
3. **A blind spin must LOOP, not run out.** The first shape ran a fixed-length spin and stopped. On a
   slow `COMB_ROLL_RESULT` that is a die sitting motionless on no number — which reads as a hang,
   not as waiting. Looping until the packet lands says "still in the air", which is the truth.
4. **The beat shortens after the third flight** (1050 ms → 600 ms, owner call). Appendix B3's
   arithmetic is the reason and it is worth restating: 60–80 flights a match means every 100 ms on
   this animation costs 6–8 seconds of a season. Split 50/30/20 spin/land/fade as *fractions*, so the
   short flight is the same motion scaled rather than a second set of numbers to keep in agreement.
5. **The budget got harness assertions; the motion did not.** CLAUDE.md § Harness rule says a
   cosmetic change earns none, and none of the spin, easing or overshoot is asserted anywhere. The
   *total* is, in `verify-comb-loop.js` (8 checks), because it is a rule rather than a look: a total
   drifting past the ceiling costs minutes of a season while looking perfectly fine on any one roll,
   and nothing on screen would ever report it. The checks pin the **behaviour** (full, then short,
   switching once at the boundary) and deliberately not the boundary's **value**, which is a tuning
   knob — verified by mutation: inverting the comparison fails 3 checks, moving the constant fails none.
6. **`combStopFlight()` absorbing the RAF is what satisfied § Timer Lifecycle for free.** All three
   required locations — the quit-confirm handler, `combResetState()`, and every early phase
   transition — already called it. One function gained one line instead of eight call sites gaining
   one each. The single exception is `combScoutFlight`, which clears the **timer only**: it is the
   function that lands the die, and the full stop would take it away one line before the face went on.
7. **Two small things a mock DOM would have silently broken**, both avoided by writing for it rather
   than finding out: the face element is stashed as `el.combFaceEl` instead of being found again with
   `querySelector` (a mock returns `null`), and teardown removes the die via the layer reference
   rather than `el.parentNode` (a mock has none, so the die would have piled up invisibly).

**Lesson:** the cheapest animation in the suite so far, because the two expensive parts — deciding the
number and getting it to every device — were already solved and the animation was allowed to be
purely a consumer of that. An animation that needs its own packet is worth a second look at whether
it is really presenting a decided result or quietly deciding one.

---

**DD-25 — The rolled number had to be drawn to be legible, and the first attempt was not. (10 Sep 2026)**

The art prompt is explicit that the shipping die carries **no digits** and the number is drawn on top
(`art-authoring-guide.md` § "Don't paint in text the game already draws"). That is right — a baked
digit cannot be skinned and cannot show a 12 — but it makes the *drawn* number's contrast the game's
problem, and the first pass got it wrong: dark ink (`#4A2E00`) picked to match the die's warm
palette, on a die whose facets are mid-brown gold. Legible in a still, mushy in motion.

The fix is a light fill inside a hard dark outline (four offset `text-shadow`s plus a soft glow),
which reads on **whichever facet the spin happens to stop on** — and that is the actual constraint:
the number does not land on a known background, it lands on a random one. A single flat colour cannot
be right for a surface that rotates. Only `visual-check` caught it; every harness was green, and the
geometry numbers were all correct while the thing was hard to read.

**DD-26 — The game does not ship until one line in `sw.js` says so, and the gate is what says the line
is safe to add. (10 Sep 2026, phase-41 gate)**
COMB spent three SW versions — v223's core art, v224's Sun Compass, and every chunk before them —
fully playable in a dev browser and **absent from an offline install**, because `js/games/comb.js`
was deliberately held out of `PRECACHE_URLS`. That was correct: the art landing before the code is
harmless, whereas a half-built plugin sitting in a user's cache is not, and `CACHE_NAME` is what
decides which of the two a returning device gets.

What is worth recording is the **shape** of the arrangement, because it made the last commit trivial
and the one before it honest. The precache line was named in `sw.js`'s own comment, in
`code-map.md` and in `CLAUDE.md` § Current Focus as *the* remaining item, three times, in three
documents that each get read at a different moment. Nobody had to remember it. When the gate ran, the
code change was one array entry and one version string; **everything else the gate found was
documentation drift**, which is exactly the right ratio for a game that had been harness-green for
days.

*Lesson:* hold the plugin's precache entry back until the closing gate **and write down, in the file
itself, that you are doing so and why**. A deliberate omission that is not recorded is
indistinguishable from a mistake at the moment it matters most — the next person's cold read.

---

**DD-27 — Shipping without a Sylly Mode needed a card, not a silence. (10 Sep 2026, recorded at the gate)**
COMB is the first game in the suite with no Sylly Mode (the decision itself is spec §12 / §17-1). The
part worth generalising is what the *absence* had to look like. Two things were considered and
rejected: a settings toggle that did nothing, and simply deleting the How to Play card.

The dead toggle is worse than it sounds. On a settings screen this suite already uses dimming to mean
*unavailable* (§ Mutually-exclusive / superseded settings) and an amber line to say why — so a
present-but-inert Sylly Mode control would be read as a setting the player had failed to unlock, and
they would go looking for the unlock. Deleting the how-to card fails differently: a player who knows
every other game has one scans for it, does not find it, and cannot tell "this game has none" from
"this overlay is missing a card".

What shipped is the card in its usual last slot, headed **"Not this one"**, saying plainly that this
is the only game in the box without one and pointing at The Season — and **no settings card at all**.
The gate promoted this to a rule in `ui-style.md` § How-to Overlay Standard as the *no-Sylly-Mode
form*, deliberately worded as an exception that has to be earned (seven rule-bearing settings) rather
than an option.

*Lesson:* when a game opts out of a suite-wide convention, the opt-out needs a **surface**. An absent
feature and a broken feature look identical from the outside; one sentence in the place the player
looks is the whole difference.

---

**DD-28 — the meadow's new panels float over the board's letterbox, they do not shrink it (SW v226,
10 Sep 2026).**
The first real session showed the board using maybe 60% of its stage box — a wide hex cluster
letterboxed into a tall container leaves ~120 px of dead green top and bottom. The obvious move is to
shrink the board and add real strips; the reason not to is `screen-comb-meadow`'s `h-screen`
whitelist entry, which exists because the board must stay fit-to-view and unscrolled. So the player
panel, roll result, probability ruler and player-stats strip are all `position: absolute` children of
the already-`relative` `#comb-board-stage`, painted from `combRenderMeadow()` behind `if (!el) return`
guards like everything else it writes. They contribute **zero layout height**, the board geometry is
untouched, and the whitelist justification still holds word for word. *Lesson: when a screen is on a
layout whitelist for a specific reason, new chrome for it lives in a layer that does not touch the
thing the whitelist protects.*

**DD-29 — `comb-map-overlay` went from a magnifier to the game's detail view (SW v226).**
It shipped (phase 41) as a full-screen pinch-zoom board with one hint line — and `combZoom`/`combPanX`
/`combPanY` existed but nothing ever moved them; the "magnifier" was just a bigger render. The
session made the case for it carrying what the inline snapshot cannot: a full per-player stats table
(points, cells, domes, walls, longest chain, Instinct held, blossoms reached) and an annotated
probability ruler. Rebuilt as three stacked zones — panel + ruler / board / stats — with the board
**gesture-locked to its middle zone** (`touch-action:none` + `overscroll-behavior:contain`, real
wheel/pinch/drag handlers finally driving the zoom/pan vars, `combClampPan()` bounding the travel) so
a pinch never scrolls the sheet. Still `combDrawBoard` — one board renderer, no second source of
truth — and still z-75, the deliberate z-fight loser. Opened from the player strip it lands scrolled
to the stats. *Lesson: an overlay that is one z-index entry and one teardown line already paid for
usually earns more entry points before it earns a sibling.*

---

## Bug Index

**BUG-01 — `combDealBoard` referenced a bare `Physics`, which is undefined in every harness
(Step 5, 7 Sep 2026, caught by `verify-comb-board.js` on its first run).**
*What happened:* the Wild deal was written as
`(typeof Physics !== 'undefined' && Physics.rng) ? Physics.rng(seed) : Physics.rng(1)`.
*Root cause:* `js/lib/physics.js` publishes `window.Physics`. In a browser that also creates a bare
global, so the guard looked fine; in a `vm` sandbox — which is every harness — `window` is a plain
stub object and the bare name is simply not defined. The guard was also self-defeating: its `else`
branch referenced the same undefined name it had just tested for.
*Lesson:* **`window.Physics`, never a bare `Physics`** — cld.js already had it right and comb.js's
own dependency header already said `window.Physics.rng`. A `typeof X !== 'undefined'` guard whose
fallback branch uses `X` is not a guard at all; it is a crash with extra steps.

**BUG-02 — 111 green checks did not cover the one rule the spec names (Step 5, 7 Sep 2026).**
*What happened:* the rules harness passed 111/111, but a mutation that deletes the tie-rule branch
**survived**. Spec §6 calls that rule out explicitly — *"Both transfers use `>` and never `>=`. That
is the whole of Q18's tie rule"* — so the harness was green on exactly the assertion it most needed
to make.
*Root cause:* every tie case in the first batch used a board where the holder was `leaders[0]`
(`[5,5,0,0]` with `holder = 0`). Both guards answer that identically, and so does a `>=` transfer,
because `leaders[0]` *is* the holder. Only a tie where the holder is **not** the lowest-numbered
leader separates them.
*Lesson:* **a tie test where the incumbent is also the array's first element proves nothing about a
tie rule.** Five cases were added — holder as the second leader, as the last of three, as the
highest index while beaten by two, plus the mirror on Fiercest Guard — and the double mutant now
dies on all five. Generalises: when asserting "the incumbent wins", make the incumbent the
*inconvenient* index, never index 0. See **TG-04**.

**BUG-03 — the board canvas had no CSS size, so it drew at 300 × 150 (Step 5, 7 Sep 2026, caught by
a screenshot, invisible to every assertion).**
*What happened:* `#comb-board-canvas` shipped with no width or height. `combDrawBoard` reads
`getBoundingClientRect()`, so it faithfully drew a correct, complete, fit-to-view board — into the
canvas's **intrinsic 300 × 150 default**. Inside `#comb-board-stage`'s centring flex box that
rendered a postage-stamp board floating in a 580 px stage.
*Root cause:* a `<canvas>` with no CSS box does not inherit its parent's size the way a `<div>`
appears to; it falls back to 300 × 150. CLD avoids this by sizing `#cld-canvas` in JS (`cldResize`);
COMB derives its draw size from the CSS box instead, which is simpler — but then the CSS box has to
exist.
*Lesson:* **every assertion I had was green while this was broken.** No overflow, no page error, the
centre pixel was painted, the transform was right, snapping hit the correct node — because all of
them were consistent with a 300 × 150 canvas. Only looking at the picture found it. A canvas-drawn
screen needs a *rendered-size* assertion (`rect.width` against the stage's, not just "something was
painted"), and it needs a human-visible screenshot in the loop. Fixed with
`#comb-board-canvas { display:block; width:100%; height:100%; }`.

**BUG-04 — a CRLF file picked up 6 bare LF from a Node patch (Step 5, 7 Sep 2026).**
*What happened:* appending a CSS block via a Node script introduced six bare `\n` into
`css/styles.css`, which is CRLF by contract.
*Root cause:* the replacement string ended each line with an explicit `\r\n` **except** inside a
multi-line comment, where the source file's own literal newlines came through as LF.
*Lesson:* the standing encoding rule is "edit CRLF files only via a Node script", but a script is
only safe if it **normalises the whole replacement**, not the lines the author remembered. Every
patch to a CRLF file should end with `.replace(/\r\n/g,'\n').replace(/\n/g,'\r\n')` over the final
string and a bare-LF count printed. Both are now in the session's patch idiom.

---

**BUG-05 — the confirm handler cleared a placement mode the applier had just re-armed, stranding the
opening draft (Step 5 chunk 3, 7 Sep 2026, caught by `visual-check`, invisible to all three
harnesses).**
*What happened:* placing the opening Drone Cell left the board lit with legal wall targets and
`combPlacementMode === null`, so the Place button never re-enabled and the draft could not be
finished. On a real device the game is unplayable from its second tap.
*Root cause:* `combDraftPlace` calls `combArmDraftPlacement()` to arm the wall that follows the cell.
`btn-comb-place-confirm`'s handler then ran its own unconditional
`combPlacementMode = null; combLegalTargets = []; combPendingTarget = null` — correct for a build
outside the draft, where nothing re-arms, and destructive inside it. The handler ran *after* the
applier and undid it.
*Lesson:* **every harness in this project calls the applier directly, so no harness can see a
button handler undoing what the applier just did.** 162 loop checks, 116 rules checks and 28 dead
mutants were all green while the game's second tap was broken — the same shape as **BUG-03**, where
every assertion was green while the board drew at 300 × 150. The applier now owns the post-placement
state in both directions (`combPhase === 'draft' ? combArmDraftPlacement() : clear`), and the loop
harness asserts the applier's half so at least the contract the handler must not break is written
down. See **TG-06**.

**BUG-06 — the client could name every unplayed Instinct card, including everybody's Golden Nectar
(Step 5 chunk 4, 7 Sep 2026, found while writing the loopback's privacy section).**
*What happened:* `COMB_MATCH_START` carries a `boardSeed` and every device calls `combDealMatch()`
with it — which is the whole point, and is why the packet carries a number instead of 19 hexes. But
`combDealMatch()` also calls `combBuildDeck(seed)`, so **every client reconstructed the exact Instinct
draw order**. Combined with the public `deckLeft` that is a complete, continuously-updated readout of
which cards have been drawn — and with the public buy events, who holds them. Golden Nectar being
hidden is, in spec §6's words, "the whole of the endgame beat".
*Root cause:* a seeded deal is a privacy decision, not just a bandwidth one, and the spec only ever
argued the bandwidth half. The board is public so deriving it is free; the deck is not, and deriving
it costs the game its endgame.
*Lesson:* **a client may re-derive only what it is allowed to see.** The fix is one line — the
`COMB_MATCH_START` applier replaces `combDeck` with a masked array of the same length, because the
count is public (the stack is on the table) and the order is not. A client never draws, so nothing
else needed changing. Generalises to any game that ships a seed instead of a deal: **enumerate what
the seed reconstructs, and mask every part of it the receiver is not entitled to.**

**BUG-07 — `COMB_DRAFT_STATE` broadcast the turn it had just finished, so the draft stalled on step 2
(Step 5 chunk 4, 7 Sep 2026, caught by `verify-comb-loopback.js` on its first run).**
*What happened:* the opening draft ran to completion on the host and froze on every client after the
host's own two placements. Seat 1 rendered a lit board with no placement mode and no way to place.
*Root cause:* `combDraftPlace()` broadcast the packet **before** advancing `combTurn`, so every
packet named the seat that had just played. The next placer's device then failed its own
`playerIdx !== combTurn` guard inside `combArmDraftPlacement()`, armed nothing, and waited forever.
On the host the bug is invisible: it advances `combTurn` locally a line later and carries on.
*Lesson:* **a packet is a snapshot of state AFTER the move, not during it.** Any broadcast that sits
between two halves of a state transition ships a position that never existed on the sender. The fix
was to settle the whole transition — advance the turn, decide whether the draft is finished — and
then send once. **This is the third COMB bug in a row (BUG-03, BUG-05, now this) that every existing
harness was green through, and the first one no amount of `'single'`-mode testing could ever have
found:** the host is the only device in those harnesses, and the host is the one device the bug does
not affect.

**BUG-08 — `convert-comb-art.ps1`'s adaptive shrink loop reported the wrong dimensions for every
image it had to shrink (9 Sep 2026, caught by re-reading the real files after the printed report
disagreed with a manual size check).**
*What happened:* the printed table said e.g. `grove -> 84x114 png 25 KB`, but the actual saved file
was `99x134`, 25.05 KB. Every group that needed more than one shrink attempt (hex, resources, hero
pieces, blossoms, wasp, die) printed dimensions one step smaller than what was really on disk — the
conversion itself was correct throughout; only the human-facing report was wrong.
*Root cause:* the loop updated `$curW`/`$curH` to the *next* candidate size immediately after a
successful save, then printed those post-update variables instead of the ones the last `Save`/`Render`
call had actually used.
*Lesson:* **when a retry loop's variables double as "what to try next" and "what just happened",
capture the second meaning into its own variable at the top of the loop body, before anything
mutates it for the next attempt.** Caught here only because the true die/hero-piece sizes were checked
directly against their (separately raised, see DD-19) caps rather than trusted from the printed table.

---

**BUG-09 — every 7 stranded every client on the default settings (10 Sep 2026, found in the first
real multi-device session).**
*What happened:* after a 7 the host advanced to *"[Name] is moving the Wasp"* while every other
device sat frozen on *"A seven. Everyone over the limit spills half."* with no discard overlay and no
way forward. The session was dead. It reproduced on **every** 7 — the default Season (Short Summer)
presets The Overflow to **Off**, so `combCarryLimit()` is `Infinity` and nobody is ever over the limit.
*Root cause:* `combScoutFlight` broadcast `COMB_ROLL_RESULT { phase: 'overflow' }` unconditionally on
a 7 — before anyone knew whether a discard was owed — so clients entered the `overflow` phase.
`combBeginSeven()` then ran host-only, and its `!combOverflowOwed.some(v => v > 0)` branch called
`combEnterWaspMove()`, which sets the host's phase locally and **broadcasts nothing**. The clients
had no packet coming.
*Fix:* the 7's `COMB_ROLL_RESULT` no longer claims a phase (it carries `seven: true`).
`combBeginSeven()` now **always** ends by broadcasting exactly one outcome — `COMB_OVERFLOW_BEGIN`
when a discard is owed, `COMB_OVERFLOW_DONE { spilled: false, phase: 'waspMove' }` when not. The
applier logs *"The hive spilled over"* only when `spilled` (absent = old packet = still log).
`combStatusLine`'s 7 is owe-aware so it never names a discard the settings disallow.
*Lesson:* **a phase-transition function reached on only one branch of a condition needs a broadcast on
*every* branch, including the one that does nothing.** "Nothing owed → skip ahead" felt like a local
shortcut; it was a packet the clients needed. See ML-09 for why no harness caught it.

---

## Multiplayer Lessons

**ML-01 — the loopback found a send-site bug in code that was already "done".** Chunk 3 placed every
`combBroadcast()` call and chunk 4 was scoped to the receive half only. The first run of the loopback
failed on step 2 of the draft (**BUG-07**) — a send site, in code three harnesses and a `visual-check`
walk had already passed. The reason is structural rather than careless: **a send site cannot be wrong
in a way a single device can detect**, because the sender's own state is right whatever it puts in
the packet. Writing the sends without a receiver is fine; *believing* them is not. Treat "the send
sites are done" as "the send sites are written" until a second device has read them.

**ML-02 — a mutation anchor that matches two sites patches the wrong one and reports SURVIVED.**
`mutate-comb.js`'s `snapshot-drops-the-holders` mutant anchors on
`largestHolder: …\n fiercestHolder: …`. Chunk 4's `combBroadcastBoard()` sends the same two fields at
the same indent, **earlier in the file**, so `String.replace` took that one instead: the packet lost
its holders, the snapshot kept them, the loop harness stayed green and the mutant reported SURVIVED
for a rule that was never broken. Fixed twice over — the anchor now carries the following
`draftOrder:` line, and the runner **fails loudly on an ambiguous anchor** (`PATCH-AMBIG`) rather
than silently taking the first match. **A mutation runner needs to distinguish "the rule survived"
from "I edited something else."**

**ML-03 — `false` and `0` are stored, so a Firebase-erasure mutant against `ready[]` or `owed[]` is
unkillable.** The first packet-layer mutant made the Overflow applier assign `p.ready` raw, on spec
§11's warning that "`ready: [false…]` is exactly the field Firebase erases". It survived — correctly.
Firebase erases **emptiness**, and `[false,false,false]` is not empty; it round-trips intact, as this
harness's own wire section asserts three lines earlier. The collection in this game that is
legitimately empty — for most of a match, for every player — is the **Instinct hand**, and `cards: []`
*is* deleted in flight. The replacement mutant targets that, and needs **two** edits because the
applier and `combSetInstinct()` defend it independently. **This is BUG-02 and TG-07 for the third
time: a test whose subject is also safe for a second reason proves nothing.** The
`combWireArr` defences on `owed`/`ready` stay — they are correct, they cost nothing, and they cover
the half-dense case — but they are prophylactic, not currently load-bearing, and the harness comment
now says so rather than repeating the spec's overclaim.

**ML-04 — a mutant that only sometimes dies is worse than no mutant.** `deal-is-not-seeded` replaced
the seeded RNG with `Physics.rng(Date.now() ^ 12345)`. The board harness proves seeding by dealing
twice and comparing — and two deals inside one millisecond give `Date.now()` the same answer, so the
mutant survived about two runs in five while looking like a solid catch on the other three. It has
been flaky since it was written; nothing noticed because a single green run was taken as the result.
Now `Math.random()`. **Run a mutation harness several times before believing it**, exactly as
`nt-impl-notes` D21 says to run a seeded harness across several `*_SEED=` values.

**ML-05 — a router that swallows throws makes its own harness blind, unless the swallow is
audible.** `combHandleEnvelope()` catches everything, because a throw escaping into a Firebase
callback strands the sender AND kills the SYNC that would have advanced everyone else
(`logic-engine.md` § Firebase callback crash safety). That is right for production and disastrous
for a test: the loopback's `no exception on any device` check could never fire, because nothing ever
escaped. The swallow now `console.warn`s, and the harness gives each device a console whose `warn`
lands in that device's error list — so a dead applier reads exactly as loudly as one that never ran.
**Any `catch (_) {}` on a path a harness watches needs an observable side effect, or the harness is
asserting against a guarantee the catch provides for free.**

**ML-06 — a field carried in two packets is a field no mutant can kill.** `combFreeWalls` went out
in **both** `COMB_INSTINCT_PLAYED`'s `effect{}` (the grant) and `COMB_BOARD_UPDATE` (so a client sees
the counter spent), and both looked justified. They were not independently justified: the two packets
are sent back to back from `combPlayInstinct`, so removing either field left the other doing the job
and the loopback stayed green. The redundancy was invisible while writing the code and obvious the
moment a mutant was aimed at it — **which is what the mutation harness is for, and it earned its keep
before it was even run.** `COMB_BOARD_UPDATE` is now the counter's one carrier, because it is the one
that *has* to exist (a build must show the counter going down), and `board-update-drops-the-free-wall-counter`
now dies. Generalise: when two packets carry the same field, ask which one is unavoidable and delete
the other — if neither is unavoidable, the field is probably derivable and should not travel at all.

**ML-07 — a reset value that matches its own `combWireArr` fill is unkillable, and the honest move is
not to plant the mutant.** Spec §11 warns that `responses[]` travels at its reset value and Firebase
erases empty collections, which reads like a mutant waiting to be written. It is not: the reset value
is `0` and `combWireArr`'s fill for that field is also `0`, so an erased `responses` and a correctly
sent one rebuild to the same array. This is **ML-03 for the third time in one game** — a test whose
subject is safe for a second reason proves nothing — and the difference here is that it was caught
before the mutant was committed rather than after it reported SURVIVED. `mutate-comb.js` now carries
a comment block saying which mutant is deliberately absent and why, because "there is no mutant here"
and "nobody thought of one" are otherwise indistinguishable to the next reader. The `combWireArr`
defence stays: it is correct, free, and covers the half-dense case.

**ML-08 — a harness helper that short-circuits is a harness helper that tests nothing.** The
loopback's `toActions(seat)` walks the table until a named seat is holding an actions phase — and
returns **immediately** when that seat is already acting, because the loop's condition is already
satisfied. Every assertion about something `combBeginTurn()` resets (an unspent Comb Rush, the
one-instinct-a-turn flag) was therefore being made against the *same* turn the previous section had
already spent, and three of them failed on the first run for that reason rather than for a real one.
The fix is a second helper, `nextTurn(seat)`, which ends the current turn first. **A "get me to state
X" helper needs to say whether it guarantees a *fresh* X or merely an X** — and the per-turn resets
are exactly the rules that cannot tell the difference.

**ML-09 — every Overflow test drove the branch where somebody owes; the branch where nobody owes was
never sent over the wire (10 Sep 2026, cause of BUG-09).** `verify-comb-loop.js` and the loopback's
§13 both set up hands *over* the carry limit and asserted the discard gate, the spill, the repair.
Neither ever rolled a 7 with every seat under the limit — the case the default settings make
universal. A conditional skip inside a broadcasting function (`if (nobody owes) { advance; return; }`)
is invisible to a harness that always makes the condition false. **Rule of thumb: for any phase
function with an early-return skip, the loopback needs a case that takes the skip, and asserts every
device still moved.** Added as loopback §12b.

---

## Template Gaps

**TG-14 — A build-order comment is a claim about the present tense, and it rots silently. (10 Sep 2026,
phase-41 gate)**
Protocol B's skeleton-first order encourages narrating the build in comments — *"Step 3 wires these to
`showScreen()` and NOTHING else"*, *"Chunk 4 adds the RECEIVE half"*, *"Each will grow a render call in
Step 5"*. Every one of those was true when written and false by the time the game shipped, and
`comb.js`'s own file header was the worst of them: it still opened with **"This file currently holds
the SCAFFOLD ONLY … There is deliberately NO game logic, NO DOM writing, NO canvas and NO multiplayer
in it yet"** above 4,900 lines of exactly those things.

Nothing catches this. All four harnesses were green, the mutation harness caught 71/71, and
`visual-check` had walked the screens — because **a comment cannot fail a test**. It surfaced only
because Protocol A's Drift Check asks a human to read the plugin against the docs, which is precisely
the check that a fully-automated verification story tempts you to skip.

The distinction that survived the sweep: a heading like `// ── The action layer (Step 5, chunk 5) ──`
is **history** and is fine — it says when something arrived. A sentence in the **present or future
tense** about what the file does not yet contain is a claim that expires. Four of those were rewritten;
the ~a dozen historical markers were left alone.

*Suggested rule (for `new-game-process.md` Stage 3 closure, or the checklist's closure block):* at the
closing gate, grep the new plugin for its own build-order vocabulary — `Step N`, `chunk N`, `will`,
`arrives in`, `not yet`, `adds the` — and re-read every hit in the present tense. It is a two-minute
check and it is the only thing standing between a shipped game and a file header that describes a
different program.

---


**TG-13 — The Motion Standard's reduced-motion rule does not survive contact with `requestAnimationFrame`,
and says so nowhere.** `ui-style.md` § Motion Standard states the global
`@media (prefers-reduced-motion: reduce)` block means "a new animation needs no per-feature
handling". That is true of every CSS animation in the suite and **false** of a RAF loop: the block
zeroes `animation-duration`/`transition-duration` and reaches nothing that writes `transform`
by hand, so a RAF animation keeps travelling at full speed with the setting on — no error, nothing on
screen to notice, and the one user who needs the setting is the one who cannot see that it failed.
Three games now run a RAF loop (NT's playback, CLD's floe, COMB's Sun Compass), so this was going to
be re-hit rather than being a one-off. **Closed 10 Sep 2026** — the bullet is now scoped to CSS with
an explicit RAF carve-out, and `combReducedMotion()` is the reference. Worth noting the shape of the
right answer, since "respect the setting" is ambiguous: show the **end state**, skip the journey. The
Sun Compass still appears and still reveals its number; it just never moves. Dropping the feature
outright would have made reduced motion mean reduced information. **NT and CLD are not swept** —
logged in `docs/deferred-work.md`.

**TG-01 — `.pill` is a row class, and nothing says so where it is used.** `ui-style.md` § Settings
Card Standard documents `.pill` entirely in terms of *groups* ("All multi-choice settings use the
Pill Button style", "Group targeting via `data-group`") and its toggle rule is about never removing
the base class. What it never states is the constraint that actually bites: **`.pill` sets `flex: 1`
and no horizontal padding, so it is only correct inside a flex row of pill siblings.** A single pill
used as a standalone button is silently wrong in two ways at once — it eats all free space in its
parent, and its label touches its own edges. Worth one line in that section. Found in COMB's hand
row and placement bar (DD-01); the CLD dive row and every how-to tab bar are correct uses, so this
is a gap in the docs rather than in the class.

**TG-02 — the darkened-label pair needs a measured floor, not just a precedent.** Three games now
darken their brand for the `[abbr]-label` step-label tone because the raw brand fails on
`bg-stone-50`: CJAR `#7A5C0A` (**5.99:1**), CLD `#2a6b85` (**5.68:1**), and now COMB `#B87A00`
(**3.45:1**). COMB's is shipped as tech spec §1 states it, but it is the only one of the three below
the 4.5:1 small-text threshold — and nothing in `per-game-classes.md` or the spec template asks for
the number, so the pattern was followed correctly while the result missed. `#9A6600` measures
**4.70:1** on the same ground and is a one-line change if the owner wants it lifted; recorded in
`per-game-classes.md` Table C note ※ so a later audit sees it as known rather than as drift.
**Suggested template line:** when a game darkens its brand for labels, state the measured ratio
against `bg-stone-50` in §1 and require ≥ 4.5:1.

**TG-04 — a green harness is not evidence until a mutant has died in it.** COMB's rules harness
reached 111 passing checks while failing to cover spec §6's headline rule (**BUG-02**), and it took
about fifteen minutes of mutation runs to find that — five one-line edits to `js/games/comb.js`, run
through the harness via the `COMB_SRC=` hook the suite already standardises on. Four mutants died;
the fifth exposed the gap. **`logic-engine.md` § MDLM Patterns already says a loopback should take
`[ABBR]_SRC=` "so a broken copy can be driven through the same wire, proving the test fails before
the fix makes it pass" — that instruction deserves to be a step in
`docs/rules/new-game-checklist.md`, applied to every harness rather than mentioned once for
loopbacks.** Concretely: after a harness goes green, mutate the two or three rules the spec calls
out by name and confirm each one turns it red. `tools/mutate-cld.js` (26/26) is the suite's existing
example of doing this as a committed tool rather than by hand; COMB should grow one at closure.

**TG-05 — the spec's "an edge, not a corner" adjacency caution is geometrically vacuous on a hex
tiling.** Spec §10's 6/8-separation rule turns on hex adjacency, and the natural worry is whether two
hexes sharing a single *corner* count. On a hex tiling they cannot: three mutually-adjacent hexes
meet at every vertex, so sharing any corner implies sharing an edge. Measured on the real topology —
42 pairs share two nodes, **zero** pairs share exactly one. The defensive `shared === 2` test is
still the right code, but a harness assertion of the form "some pair shares exactly one corner"
asserts something impossible and will always fail. Worth one line in the spec template so the next
hex game does not spend the same half hour on it.

**TG-03 — a three-tab how-to bar wraps its longest label at 390 px.** COMB's tabs are
`The Rules` · `The Comb` · `The Instinct Deck`; the third wraps to two lines, which lifts all three
pills' height. Nothing overflows and no tab is unreachable (verified at 320/360/390 px), so this
ships as the spec's confirmed copy. PKO's three tabs avoid it only by being one word each
(`Rules` · `Diagram` · `Animals`). If a fourth game wants three tabs, the practical ceiling is about
**11 characters per label** at 390 px — worth stating in `ui-style.md` § Optional tab bar rather
than rediscovering per game.

**TG-06 — the "an applier re-arms, and its caller must not undo that" gap.** `ui-style.md` § The
Stack rule 4 covers a *screen* repainted by more than one render function: each must own every
element it cares about. **BUG-05** is the same failure one layer down and nothing covers it — a
*state variable* written by both an applier and its own button handler, where the handler runs
second and wins. It is invisible to every `tools/verify-*.js` by construction, because all of them
call the applier and none of them clicks a button. Suggested rule, next to rule 4: *when an applier
sets UI state on behalf of the next step, its caller must re-derive rather than clear — a handler
that unconditionally resets placement/selection state after calling an applier will silently undo
whatever the applier just armed.* The one-line test is worth stating too: **walk the screen's first
three taps in `visual-check` before calling a build chunk done**, because that is the only tier that
can see it.

**TG-07 — a `_SRC=` mutation run should be a checklist step, not a per-game habit — and this build
now has the tool.** TG-04 asked for exactly this and `tools/mutate-comb.js` (28 mutants) is the
answer: every rule the spec names by name gets a plausible mis-implementation driven through all
three harnesses via `COMB_SRC=`. **The run paid for itself twice.** It found that the "the mover is
never their own victim" rule was untestable as written — the harness gave the mover an *empty hand*,
so the empty-hand guard excluded them and the mover guard was indistinguishable from its absence.
That is **BUG-02's lesson repeating exactly**: a test where the subject is also the convenient case
proves nothing about the rule under test. Generalised: **when asserting "X is excluded for reason A",
make sure X does not also qualify for exclusion under reason B.**

**TG-08 — "the send sites are done" is not a state a checklist should let a chunk close in.**
ML-01 above is the general case: `docs/rules/new-game-checklist.md` treats the MP handler audit as
one item, and it is natural to satisfy the send half in one chunk and the receive half in another —
COMB did exactly that, deliberately, and it was the right split. What is missing is the line saying
**a send site is unverified until a second device has read it**, because no `'single'`-mode harness
and no `visual-check` walk can distinguish a correct packet from a wrong one. Suggested checklist
wording, next to the missing-handler audit: *"Broadcasts written without a receiver are drafts. The
chunk that adds `[abbr]HandleEnvelope` re-verifies every send site through the loopback, and should
expect to find at least one wrong."* COMB found one (**BUG-07**) in code that had already passed 334
checks and a browser walk.

**TG-09 — a seeded deal is a privacy decision, and the template only argues bandwidth.**
`logic-engine.md` and every tech-spec template present "send the seed, not the deal" as a payload-size
win, which it is. **BUG-06** is the other half: whatever the seed reconstructs, the receiver now
*knows* — and in a game with a hidden deck that is the entire hidden layer, handed over in the first
packet of the match. The rule is one line and belongs beside the technique: **enumerate everything
the seed reconstructs, and mask every part of it the receiver is not entitled to see.** COMB's fix is
the reference shape — the client keeps the deck's *length* (public: the stack is on the table) and
loses its *order*, in one line of the `COMB_MATCH_START` applier, because a client never draws.

**TG-10 — the overlay registry has no room for a control that must not cover the board, and the
templates offer no third thing.** `ui-style.md` names exactly two overlay patterns and `new-game-technical-template.md`
asks for an overlay registry, so a spec's answer to "where does the build picker live?" is always
"an overlay". For a game whose defining constraint is that the board never goes away, that is the one
answer that cannot be right: choosing **what** to build is the decision a player makes while reading
**where** it could go. COMB's answer is an inline sibling in the Controls zone (DD-12), with exactly
one of picker / placement bar / action bar shown at a time. It needs no new pattern and no new
vocabulary — the Stack already describes it — but nothing in `ui-style.md` currently tells a spec
author that "a mutually exclusive sibling in the Controls zone" is an option, so the overlay registry
gets reached for by default. Worth one line in § The Stack: **a control the player uses while reading
the Stage belongs in the Stack, not over it.**

**TG-11 — "reject, don't prevent" needs a third state, and it is the useful one.** §7 splits
validation into *prevented* (the target never lights up) and *rejected* (the tap shakes). The build
picker needed a third: **dimmed but tappable**, which is neither — the control is visibly unavailable,
and tapping it explains why rather than doing nothing or shaking. `ui-style.md` already has the
ingredient (the dimmed board target that stays tappable for its reason) but frames it as a board
behaviour rather than a general one, and `.comb-btn-off`'s `pointer-events: none` is the suite's
default for a disabled control — which makes the explanation unreachable exactly when it is most
wanted. A new game's disabled-control CSS should decide deliberately between "inert" and "inert but
answerable", and the second should be the default wherever a rule, rather than a phase, is what
disabled it.

**TG-12 — `tools/convert-core-art.ps1`'s two-tier config (card width / extra width, JPEG-only)
covers every game so far by accident, not by design, and the accident ended with COMB.** Every prior
core-art game has exactly one `art.js` `kind` and opaque card-shaped art, so one width + one JPEG
quality walk was always enough. COMB needed nine kinds, mixed PNG/JPEG, and per-group (sometimes
per-id, see the wall-vs-cell/dome split in `tools/convert-comb-art.ps1`) target boxes — nothing
about the existing script's shape extends to that, so a second script was written rather than
generalising the first. **A related trap, caught before it shipped rather than after:** the
authoring-guide's "Draw at" column is the size the *artist generated at*, not the size to *ship at* —
starting the hex/hero/die conversions from that master size (224×304 / 300×300 / 512×512) rather
than the actual CSS render size plus DPR headroom is what produced the first, wildly-over-cap
run. `docs/expansion-guide.md` § Core art packs and the FLW script comment already say "size against
the RENDER size, not the previous game's number" — worth restating for a *second* game now, since
the same mistake was nearly repeated with different numbers. Suggested addition to
`docs/art-authoring-guide.md`: when a game's art needs more than one `kind` or needs alpha, point at
`tools/convert-comb-art.ps1` as the reference shape rather than `tools/convert-core-art.ps1`.
