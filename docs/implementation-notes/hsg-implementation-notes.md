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
