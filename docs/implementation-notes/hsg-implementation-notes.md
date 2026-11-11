# Hide and Shogun — Implementation Notes

Design decisions, bugs and lessons from building Hide and Shogun (`hsg`, game 22). The spec is
`docs/new-game-tech-hsg.md`; this file records what the build learnt. Entry shape: **What happened →
Root cause → Lesson**.

---

## Design Decisions

### DD-01 — The square owns the motion; the seam owns the picture (S4)
**What:** the board is 30 stable `<button class="hsg-sq">` slots, created once. Each render asks
`hsgRenderTile(cell, opts)` for a new tile **only when that square's key changes** (cell + mark +
armed/screen/last). The lift, the glow and the drag dimming are classes on the *slot*.
**Why:** a render seam returns a fresh node, and a fresh node has no previous state to transition
from — putting the 3 px / 7 px lift on the tile would make every lift jump. Split this way, the seam
stays the only thing that draws a tile (asset-pack rule) and the slot's `transform` transitions.
**Lesson:** when a seam-drawn primitive also needs motion, give it a stable parent that carries the
motion and swap the seam's child under it.

### DD-02 — A fixed-height board sized by CSS, not by a resize listener (S4)
**What:** `.hsg-castle` is `100dvh` (with a `100vh` fallback) and
`--hsg-t = max(30px, min(58px, width budget / 5, (height − fixed chrome) / 6))`. The fixed chrome is
summed from custom properties, so the compact tier (`max-height: 600px`) changes only those numbers.
Measured: 37.7 / 53.7 / 58 px tiles at 320×452 / 375×548 / 375×667, no scroll anywhere.
**Why:** the board must never scroll (spec §17 #7), and a JS measure-and-set would need a resize
listener plus teardown. The brief's merged-bar strip for 320×452 is still S12's (spec §16 Q7).
**Lesson:** for a fixed-height screen, write the chrome as named heights and derive the content
size from what's left — the compact tier is then a list of numbers, not a second layout.

### DD-03 — `hsgPub.last` gains `seat` and `vid` (S4)
**What:** the last Command now records who made it and the piece it struck (`''` otherwise).
**Why:** the message card must say "Priya's Ninja just leapt onto a Guard". After a Strike the victim
is gone from the board and the mover can't be derived once a Battle ends, so neither can be read off
the pub. Both were in the open, so nothing private travels. Spec §4 updated; `verify-hsg` pins it.

### DD-04 — Battle 1's fan toss runs 4.5 s, not 3.5 s (S5)
**What:** `hsgBattleIntroMs(pub)` gives 4.5 s when `battleNo === 1 && !replay` (the toss) and 3.5 s
otherwise. The call ("It lands on Alexandrina Ko. Alexandrina Ko opens the first door.") appears when
the fan lands, at 1.7 s; a Battle N call appears with the fan snap at 0.9 s.
**Why:** the toss is the only state whose verdict arrives late. At 3.5 s that left 1.8 s to read
the longest line in the Battle intro, three lines tall at 375×667 with 14-character names. 4.5 s keeps
it under the interstitial's ~5 s ceiling. A Truce in Battle 1 replays and doesn't toss again.
**Lesson:** an interstitial's length is set by its last reveal, not its first. Time the line that
arrives last.

### DD-05 — The Storyteller is CSS-timed; the sound and the picture share one number (S5)
**What:** `HsgScene` owns no timers. Every motion (the panes sliding shut, the lamp coming up, the fan
raised and snapped, the toss) is a keyframe delayed by `--hsg-snap`, which `hsgPaintBattleIntro` sets
from the same constant (`HSG_SNAP_MS` / `HSG_TOSS_LAND_MS`) that schedules the sound through `hsgLater`.
Base styles are the final pose, so reduced motion (`animation: none`) shows the finished picture at once.
The Battle intro mounts its own instance (`HsgScene.make()`), so it can never stop the Intro's or be
stopped by it. The Intro gets `hsgIntroScene`, a wrapper that plays the snap only when the beats end
live (a re-mount or a returning Intro sends `beat(-1)` with no line before it and stays quiet).
**Why:** the task's rule "every timer through hsgLater" and "the scene never calls play*()" pull in
opposite directions unless the scene has no clock at all. The global reduced-motion block only
shortens *durations*, so a delayed keyframe would still hide the call for 0.9 s. `hsg.css` adds its
own `animation: none` for that.
**Lesson:** when a pure scene and the game must stay in step, pass the scene a CSS custom property,
not a callback, and write base styles as the end state.

### DD-06 — Both War Chronicles are one painter over one pure model (S6)
**What:** `hsgChronicleModel(pub)` (pure, reads only the public copy) returns every word and flag; `hsgPaintChronicle(final)` writes it into `#hsg-chron-body` or `#hsg-go-body`. The five variants are picked from `result.reason` + `.gekokujo` only. A Campaign-won result takes the headline slot ("Hana takes the Campaign!") and the variant title moves to the sub-line.
**Why:** the two screens differ only in headline and buttons, and S7's client paints from the same pub, so the model is what `verify-hsg` pins (§ 13) and the DOM half stays presentation. Forfeit ("Priya left the field") is not built: Leave the Field dissolves the session for both (spec §11), so there is no screen to show it on.
**Lesson:** a keyframe that ends at `opacity: 1` with fill-mode `both` silently undoes a static `opacity` dim on the same element — dim the loser banner with `filter`, not `opacity`.

### DD-07 — The bot's view is the pub plus the host's unseen counts, not counts rebuilt from the pub (S8)
**What:** `hsgBotView(i)` returns `{ me, pub, unseen }`, where `unseen` is a copy of `hsgB.S.pool`, the per-colour, per-piece count still behind doors. `hsgBotDecide` rebuilds the board with `hsgMaskedState(pub)`, puts `unseen` back as `S.pool`, and calls `HsgRules.choose()` through `hsgBotRng`, a `{ random, choice, shuffle, sample }` adapter over the engine's bare `() => float`.
**Why:** the counts *are* public (anyone watching every door open could keep them), but the pub can't rebuild them: a struck piece leaves the board, and the pub keeps only a per-colour struck count plus the last victim. Keeping a running tally on the pub would have meant a new packet field for one consumer. Taking the counts from the host is the same information with no wire cost. Fairness holds because shuffling the closed doors leaves the multiset, and so `S.pool`, unchanged. `verify-hsg-bots` proves it at all three levels.
**Think times:** Easy 700–1,200 ms, Medium 900–1,600 ms, Hard 1,100–2,000 ms (spec §11). Hard's `decide` measured at a max of 2.8 ms on Node with the look-ahead running, far under the 150 ms budget.

### DD-08 — A moment is a Command this phone watched, played from two snapshots (S9)
**What:** `hsgPlayMoments(before, pub, fx)` runs on every phone after a Command: the host from
`hsgHostCommand`, a client from `hsgApplyCommandDone`. It reads only the snapshot before, the snapshot
after and the fx keys, never `hsgB`, so a moment can't show what the pub doesn't, and both phones play
the same one. It runs only when `cmd` moved by exactly one in the same Battle. A repair, a rejoin, or a
COMMAND_DONE that skips one (a lost packet) is drawn but never animated, since animating it would slide
a door whose Command this phone never saw. Fox moments come from diffing the boards (`#` → `Fx…`, or
`Fxp` → sided), so a fox sided by the banners gets its stamp too.
**Why the test exists:** the loopback mutant with the `cmd + 1` guard removed stayed green until a check
fed the client a COMMAND_DONE two Commands ahead (with a one-ahead control). A guard that only defends
against a lost packet needs a test that loses one.
**Geometry:** squares are measured with `offsetLeft` / `offsetTop` (the Castle is their `offsetParent`).
A lifted square is still easing back down when its Command lands, so `getBoundingClientRect` would put
the door panel up to 7 px high. Bars, beam and lanterns use the rect.

### DD-09 — Reduced motion is decided per moment in JS: skip the motion, keep the news (S9)
**What:** a moment that is only motion (the door slide, the fold, a lantern's puff, the relight) is
**skipped**, because the board already shows the result. A moment that carries news (the banners, the
fox's stamp, the cracked ring, the ink blot, Found you!) is drawn with `.is-still`: no animation, the
held pose at once, removed by the same timer.
**Why:** each moment is an in-animation, a hold and an out-animation in one `animation` list. Under the
suite's global block (durations → 0.01 ms, delays kept), the out-fade fires at its delay and the banner
is gone early. With `animation: none` instead, a panel meant to slide away would sit over the piece.
Neither is a still form. A `@media` rule in `css/hsg.css` backs up the JS.
**Measured:** at 375×667 and 320×452, in both motion settings (`visual-check`). The ending banners were
2.2 tiles long, which clipped the losing banner's name under its swallowtail at 320×452. They are now 2.6
tiles, the same as Raising the Banners, and still clear the Found you! card.

---

## Bug Index

### BUG-01 — A drop's own click would have undone the drop (S4, caught while writing)
**What:** dropping a dragged piece on an unlit square should leave it lifted, so tap-tap can finish
the Command. But the grid takes **pointer capture** during a drag, so the browser's follow-up
`click` is aimed at the grid, not a square. It misses the square handler, bubbles to the Castle's
"tap anywhere else cancels" handler (`hsgTapOff`), and that puts the piece straight back down.
**Root cause:** pointer capture retargets the synthetic click to the capturing element.
**Fix:** `hsgDragEndAt` timestamps the drop; both the square click handler and `hsgTapOff` ignore a
click within 400 ms of it. No timer to clear.
**Lesson:** a drag with pointer capture plus a "tap off to cancel" listener on an ancestor needs the
post-drop click swallowed in **both** places.

### BUG-02 — The S6 draft sent a rejoiner to the wrong end screen (S7, caught re-reading the send sites)
**What:** `hsgPhaseForWire()` mapped the ending beat to `'chronicle'` for every Battle. When that Battle
won the Campaign, a rejoiner (or a refused-ACTION repair) would land on the between-Battles Chronicle
with a Next Battle the host refuses, since the host is heading for the gameover. A second, related bug:
`hsgFinishEnding` decided Chronicle vs gameover from `hsgResult`, which only the host ever sets, so a
client's ending beat would always have gone to the Chronicle.
**Root cause:** both were written when only the host ran them. "Campaign over" was host-only
bookkeeping, though it already travels in `pub.result.campaignOver`.
**Fix:** `hsgPhaseForWire` returns `'gameover'` for an ending with `campaignOver`; `hsgFinishEnding`
reads `hsgPub.result`. Pinned by `verify-hsg` § 9 and the loopback's § 8; mutants of either fail.
**Lesson:** this is logic-engine.md's "a send site written without a receiver is a draft" happening as
predicted. When a function a client will also run reads a host variable, check whether the same fact
is already in the pub, and read it there.

---

## Multiplayer Lessons

### ML-01 — Two channels, no order between them: refuse an older snapshot, not just apply the newest (S7)
**What:** the client applies whole snapshots, but they come on two channels: `HSG_BATTLE_START` /
`HSG_COMMAND_DONE` on the public one, `HSG_STATE` on the private one. Firebase orders each channel
but not one against the other. One case: both players tap Next Battle. The host starts the Battle,
refuses the client's late tap and repairs it with `HSG_STATE`. If the repair arrives first, the client
is already in the Castle when the public `HSG_BATTLE_START` lands, and applying that would restart the
intro over a live board.
**Fix:** every client applier first asks `hsgIsStale(pub)`: same Battle (`battleNo` + `replay` +
`firstSeat`, since the first move flips every Battle, so consecutive replays still differ) with fewer
Commands, or the same Command once the result is already held. `HSG_BATTLE_START` for a Battle already
on screen is ignored. Every applier still releases the sync lock first, so a refusal never strands a
phone even when its snapshot is ignored.
**Lesson:** "the snapshot always wins" needs a definition of *newer* once there is more than one
channel. A Command counter inside a Battle identity is enough, and costs no packet field.

### ML-02 — The fake wire is synchronous, so "in flight" must be made (S7)
**What:** the first double-tap check failed. The second submit went out, because `mp-world`'s server
delivers inside the write: the host's answer had already released the lock inside the first
`hsgSubmitCommand` call. The game was right (the second ask was a new, stale one, which the host
refused). The test was measuring nothing.
**Fix:** `server.busy = true` around the taps. Writes land in the tree and subscribers hear on
release, which is a packet in flight. Under it, the lock holds, the second submit is dropped at
`mpSendEnvelope`, and taps on a second door don't even lift it.
**Lesson:** any loopback check about "while waiting for the host" needs delivery held, or it passes
or fails for the wrong reason. Noted in `docs/rules/harnesses.md`.

### ML-03 — The client-side shuffle test compares the painted DOM, not just the pub (S7)
**What:** spec §15 asks for verify-hsg's privacy test on the client side. The loopback shuffles the
host's closed doors mid-Battle, rebuilds the pub, repairs the client, and asserts that both the
client's pub **and** every string its renderers wrote (text, HTML, classes, attributes, walked through
appended children) are byte-identical.
**Why:** a pub-only check would miss a renderer that read something other than the pub. The DOM walk
catches it with no extra assertions per screen.

### ML-04 — A decision-only fairness check can't fire here, so compare the view too, with a leaky control (S8)
**What:** `HsgRules.choose()` reads a closed door's contents only in `evaluate()`, which runs only when
no door is left closed. So a `decide` that reasoned over the host's **real** board would make the same
decisions as the masked one, and "same decision under a shuffled layout" would stay green over a real
leak. `verify-hsg-bots` compares the **view** byte for byte as well, and runs a deliberately leaky view
(the layout attached) through the same comparison to show it goes red.
**Mutants:** a layout leak, no stale-tag drop, the wrong seat→team map and a wrong think range each go
red. Sharing `S.pool` by reference instead of copying it survives: `choose` only reads the pool, so that
mutant is equivalent and the copy is defensive.
**Lesson:** before trusting a fairness check, ask whether the code under test ever *reads* the hidden
state. If it never does, the decision can't reveal a leak; the view, which is the actual contract, has
to be what you check.

### ML-05 — Moments are removed by timers, so stopping the timers must clear the layer (S9)
**What:** every moment box is removed by its own `hsgLater`, and `hsgStopTimers()` runs at every Battle
start, ending and teardown. If it cleared the timers but not the boxes, every moment still in flight
would stay on the board for good. `hsgStopTimers` now calls `hsgClearMoments()`.
**Found by:** the loopback never moves the clock between taps, so dozens of moments pile up in a Battle.
With the clear removed, "a new Battle leaves no moment behind" goes red. A harness that let each moment
finish would have passed.
**Lesson:** when a timer owns a DOM node's removal, the function that kills the timers must remove the
nodes too, and the test should hold the clock still.

### ML-06 — Reconnect cost one config entry because S7 built the snapshot first (S9)
**What:** adopting `reconnect` changed no game code. `hsgSendState` and the `HSG_STATE` applier were
written in S7 as the refusal repair, and `hsgOnEnter`'s client path already tore down and waited.
`verify-hsg-loopback` § 9 drives a real drop and reload through `mpRejoinRoom` from the Battle intro,
mid-Battle (after an Away), the ending beat and the Chronicle. It passed first time, apart from a wrong
element id in the test itself.
**Lesson:** when a game's whole state is one public snapshot, build the repair packet as the rejoin packet
from the start. They become one function, and adopting `reconnect` later takes three lines.

---

## Template Gaps

### TG-01 — A world's sound icon can't be an SVG (S4)
**What:** the board drew the Castle's header as line icons. `toggleMute()` and the engine's boot
block set `textContent` on **every** `.btn-open-sound` to 🔊 / 🔇, so an SVG inside one would be wiped
on the first mute. HSG keeps the suite's text glyphs in paper cream (departure logged).
**Lesson:** a direction board should be told the sound button is engine-owned text. Candidate line for
`docs/rules/ui-revamp.md` (frozen chrome) if a second world hits it.

### TG-02 — A one-line message card cuts the half that matters (S4)
**What:** the first compact tier clamped the card's second line to one line. At 320×452 the ending
read "In the open: Crimson 9 · Indigo 11. Priyanka Raju…" — the verdict was the cut half.
**Fix:** compact card 50 px, two lines at 11 px (costs ~1 px of tile). Found by measuring
`scrollHeight > clientHeight` with 14-character names (lessons L7), not by looking.
**Lesson:** when a status line puts the outcome last, measure the clamp with the longest names
before shrinking it to one line.

### TG-03 — A scene's own line card stacks on the engine's narrator card (S5)
**What:** the first Intro scene had its own "THE STORYTELLER" label above the line, directly over the
engine's "THE STORYTELLER · A RAKUGO TELLER…" card. The card also stayed after the beats ended, which
pushed **Let's go** to 714 px at 375×667. Fix: no label in the scene card, and the card folds away
when the fan snaps (`beat(-1)`). Let's go now sits at 640 px. At 375×548 and 320×452 the Intro still
scrolls by 56 and 124 px (it is a Stack).
**Lesson:** a scene with `beat()` owns the *line*, not the *speaker*. The engine already names the
speaker. Candidate for `docs/rules/ui-revamp.md` § 4 if a second world repeats it (ETA's clipboard
carries "DOTTY · HEAD OF DISPATCH", so it may already have).

### TG-04 — The global reduced-motion block can't give an in/hold/out moment a still form (S9)
**What:** `docs/rules/ui-motion.md` says a new CSS animation needs no reduced-motion handling because the
global block collapses durations. That holds for one-shot entrances. It fails for a transient with an
in, a hold and an out in one animation list: the out-fade still fires at its delay, so a banner or a stamp
goes early. See DD-09.
**Candidate rule for ui-motion.md:** a transient that *carries information* needs a still form chosen in
JS (shown held, without animation, for the same time). A transient that is *only motion* may be skipped.
Becomes a rule if a second game repeats it.

## S10 — The Household, plus the seals and door pass (12 Nov 2026)

### DD-10 — Honour Seals carry the clan they were won as (`pub.wins`)
**Decision:** the shared red seal is gone. `hsgWins` records each Seal as `seat | colour << 1`, rides on the
public copy as `pub.wins` (rebuilt on receipt with `hsgWireList`, since `[]` is erased in flight), and every
seal (bars, Battle intro tally, Chronicle) is drawn in that clan's colour with its Sun / Moon symbol.
**Why a record, not a count:** a seat's clan changes every Battle, so `seals[seat]` can't say which colour a
Seal was. The record also gives the Chronicle its *order of wins*.
**Chronicle:** the ledger (`hsgLedgerHTML`) now comes before the stats — a lane per player, a column per Seal,
left to right in the order won. Columns = Campaign length, growing one per Battle up to 2N−1.
`verify-hsg.js`'s pub-key allow-list gained `wins`; `tools/lib/mp-world.js` stubs `bindCardHold`.
### DD-11 — The Household tab
One row per piece through `hsgRenderTile` (never hand-built), then the ladder, the five upsets and the
Archer → Samurai → Farmer → Archer loop. Long-press a board piece → its row (`hsgBindCardHold`); the hold
cancels any drag in flight and swallows the follow-up click. Doors got a lacquer rim so a closed square reads
as a square, not as part of the grid.

## S11 — Practice (12 Nov 2026)

### DD-12 — Practice runs the real rules through the Castle's own tap code
Nine lessons (brief §24), each a fixed engine state (`HsgRules.applyAct`, doors holding real hidden pieces) turned into a public-copy-shaped object by `hsgPracPub()`, so `hsgTapDecide` / `hsgMarksFor` / `hsgRenderTile` run unchanged. Only the top `rows` rows are drawn; `hsgLegalFor` got one optional line (`pub.pracFilter`) that narrows legal Commands to the drawn rows **and the taught move**, so a stray tap can't strand a board and a lifted piece shows exactly one mark. Sam (the cast) only moves in the Last Lantern lesson: a scripted March per player March, so the beam really runs 8 → 12; the reply waits 600 ms on `hsgPracTimers`, or is instant when `matchMedia('(prefers-reduced-motion: reduce)')` is true.
**Why a filter, not free play:** the brief's checks are single moves; letting the player wander makes every lesson need a recovery path. "Practice again" is the recovery.
**Lesson learned:** a `from` ring that names fixed squares breaks once a piece has moved (lesson 9, first draft stuck on step 2) — a ring is a function of the state (`hsgPracOwn`).
**Layout:** at 320×452 the sheet's header and three tabs leave ~190 px for the body, so a lesson scrolls inside it (same as Rules and Household); the coach line scrolls itself into view on each beat. Tabs squeezed to one row with a scoped CSS rule. Revisit at S12.
**Not taught:** the full strike chart (Household), Sylly Mode (none), the Campaign.

### DD-13 — The Shogun's Guarded / Exposed status lives on his tile (playtest, 12 Nov 2026)
The bar's Guard ring was too quiet and Practice has no bars. `hsgRenderTile` takes `opts.guard` for an open Shogun: frame + flag, gold/solid vs red/dashed (never colour alone). Both the Castle and Practice pass `hsgShogunState(pub, cell)`; the Castle's tile key includes it so the tile redraws when the last Guard falls.
