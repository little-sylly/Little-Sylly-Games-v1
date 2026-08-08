# Cookie Jar (`cjar`) — Implementation Notes

Game 18. Simultaneous-choice push-your-luck card game, MDLM-only, 4–8 players,
host-authoritative, host-as-participant. Sylly Mode = Dibber Dobber.

Spec: `docs/new-game-tech-cookie-jar.md` · Plan: `docs/superpowers/plans/2026-08-02-cookie-jar.md`

---

## Design Decisions

**DD-18…DD-24 — the action-stage rework.** *(Owner call, 7 Aug 2026 — spec: `docs/superpowers/specs/2026-08-07-cjar-action-stage-design.md`)*
Three playtest rounds (1–3) kept reporting "the action stage is still off" — players choosing
based on what just happened rather than what's about to happen. Round 1 attacked it as a
duplication problem (DD-11), round 2 as a layout problem (DD-12/DD-15). Neither fixed it, because
the cause was neither: **the base game's payout mutated state with no on-screen beat.**
`cjarApplyCardEffect` split a cookie card's value into `cjarRaidTotals` immediately, with no
animation, no screen change, and no sound beyond the card's own; the only cookie feedback in the
game (`cjarFlyDelta`) fired solely on a *stash* change, which in the base game only happens on
Sneak Out. So on a normal flip — the vast majority — you gained cookies and nothing moved. See
TG-08 below; it's the reusable lesson.

**DD-18 — the centre slot holds the card you're betting on, face-down, not the one that just resolved.** The stage's largest object (`#cjar-table-hero`) now renders `cjarCard` face-down at rest and flips face-up only during the reveal choreography. The button beneath it is now literally correct: it acts on the object above it. Dibber Dobber already worked this way (`cjarOpenBlindWindow` sets `cjarCard = null`); this removes a mode divergence rather than adding one. No information is lost — the warning strip shows which family member just appeared, the newest history-strip thumb is the card itself, and the full log is one tap into `cjar-trail-overlay`.

**DD-19 — a 2100 ms reveal choreography (`CJAR_FLIP_ANIM_MS`), paid for mostly out of `CJAR_REVEAL_MS`.** Beats: flip (0–300 ms) → hold (300–900 ms) → payout (900–1600 ms, type-dependent) → settle (1600–2100 ms). `CJAR_REVEAL_MS` dropped 3000 → 1200 ms (it now covers only the choice-outcome dwell — a genuinely separate event from the card flip). Net **+300 ms per flip**. `cjarEndTimestamp` includes the full animation length, so Blitz's 10 s decision window stays a true 10 s, not 10 s minus the animation — `cjarOpenDecisionWindow` computes `animMs` per mode (0 for Sylly, which reveals *after* choices lock and so has nothing to animate before deciding) and adds it before the window's own `windowMs`. **Implementation deviation from the spec:** the spec proposed a new `cjarTablePhase` value `'flipping'`; the shipped code instead layers a boolean, `cjarFlipAnim`, on top of the existing phases (`cjarTablePhase` goes straight to `'deciding'`/`'revealing'` as before). `cjarRenderStage`/`cjarRenderControls` gate on `cjarFlipAnim`, not on a phase string. Functionally equivalent, simpler diff — noted here so nobody greps for a `'flipping'` string that doesn't exist.

**DD-20 — no per-player flight paths.** A token animating to each player's exact score row needs live `getBoundingClientRect` geometry — fragile under scroll, breaks silently when the table's off-screen, invisible to every headless harness. Rejected. Instead `cjarFlyTokens(count, direction)` fires a burst whose **direction** signals the destination (`'down'` toward the score table, `'left'` toward Crumbs) and whose **token count** equals the number of seats actually splitting the card. The per-player payload lands as the affected pill counting up and pulsing, which needs no geometry at all.

**DD-21 — button labels: one metaphor across both modes.** Base: **Reach In Again** / Sneak Out. Sylly: **Reach In** / Play Innocent / Dob. Replaces "Take a Cookie", which was factually wrong in the base game (cookies are split among everyone active *before* the button exists — the choice is participation, not taking) and grammatically wrong in Sylly (a taker receives a *share* of the card's value via `cjarSplit`, not one cookie, and a noun phrase beside two verb phrases broke the three-parallel-acts reading). "Sneak" still never appears in Dibber Dobber copy. No emoji, per the Action Button Standard.

**DD-22 — score rows split into two pills, `stashed` and `at risk`.** `0 🍪 (+1 in)` buried load-bearing information in a parenthetical, read at a glance during a timed simultaneous decision. Now `🔒 N stashed` (`.cjar-pill-stashed`, `cjarStashes[i]`, always shown) and `N at risk` (`.cjar-pill-risk`, `cjarRaidTotals[i]`, **base game only** — Dibber Dobber has one running Stash and no Raid-local pool, so its rows show the Stashed pill alone). A departed seat drops the At Risk pill. During `'revealing'` the pills now stay on screen (previously replaced by the delta text, so Open Book's standings vanished at the exact moment you'd want to compare them) — the delta flashes on the Stashed pill instead.

**DD-23 — "Up for Grabs": Crumbs and the Treat as one object.** Column 1 (`#cjar-grabs-card`) holds both, because both are the same idea — shared table state a solo Sneak Out claims. Crumbs promoted to a prominent top count; the Treat slot below it keeps round 2's dashed-placeholder-at-the-exact-footprint rule (`#cjar-grabs-caption` carries a permanent one-line reminder of the rule, promoted out of a tap-to-reveal tip a rejected Gemini alternative proposed — a preview would leak intent to anyone glancing at your screen, and phones have no hover state to hang it on).

**DD-24 — column 3 demoted from "the bet" to the reservoir.** DD-18 moved "the card you're betting on" to column 2, so column 3's old rationale for its size (`cjar-card-next` at 7.2rem) inverted — it shrinks and renders as `.cjar-deck-stack`, an offset stack of three card backs plus the live count, rather than a single back. Two lone face-down cards side by side would read as "which one is next?"; a stack reads unambiguously as "the deck" — and it's literally where the settle beat lifts the replacement card from.

**Implementation deviation from the spec (second one — Treat timing):** §4's payout-beat table places
the Treat's arrival into column 1 in the 900–1600 ms payout beat, alongside the cookie token burst.
The shipped code doesn't wait for it: `cjarApplyCardEffect` sets `cjarCounterTreat` at the moment the
card is popped — **before** `cjarBeginFlipAnim` even runs — so the Treat is already sitting in column
1 on the choreography's very first paint (t≈0), not partway through it. Accepted, not a bug: DD-23's
"art fills the same footprint a placeholder already occupies" rule means an early fill-in reads as,
at worst, a slightly early reveal rather than a jump — but it means the Treat is the one payout type
that does NOT share the 900 ms beat the cookie burst and the family pulse share. Recorded here so a
future playtest round doesn't rediscover it as drift and re-open it as a bug.

**Verification note:** all five harnesses needed updating for this rework — the new `cjarFlipAnim` gating and the label changes broke existing assertions **by design**. `verify-cjar-loopback.js` (the only harness with real mock DOM elements, so the only one that executes render code) grew from 112 to 147 checks: the face-down hero during `'deciding'`, the label swap, both pills in both modes and at both Open Book settings, the Up for Grabs card with/without a Treat, and — added in a follow-up fix — the bust card running its own flip beat before `screen-cjar-busted` (previously the bust resolved and jumped straight to the verdict, skipping the flip animation every other card type got). `verify-cjar-deck.js` 73 → 75, `verify-cjar-loop.js` stays 102 (gained checks, lost none), `verify-cjar-dd.js` stays 47 (gained the Stashed-pill-alone assertion). `simulate-cjar-dd.js` is unchanged and its output moved only within the existing noise band — expected, since nothing in this rework touches a rule, a value, or a probability (DD-06's flagged Innocent-lean is untouched).

**Final-review fix wave, 8 Aug 2026 (BUG-09, BUG-10, BUG-11 above):** all three were presentational —
none touched a rule, a value, or a packet field. `verify-cjar-loopback.js` grew again, 147 → **164**
(the settle-handover trail check, the mid-window-quit bust-timeout check, and the all-innocent
payout-beat check, each proven to fail against the pre-fix code before being proven to pass against
the fix). `verify-cjar-deck.js` grew 75 → **76** (`CJAR_FLIP_ANIM_MS` now has the same exact-value
assertion every other timing constant in that block already had). `verify-cjar-loop.js` (102) and
`verify-cjar-dd.js` (47) were untouched by this pass. `simulate-cjar-dd.js` output is unchanged
within the existing noise band, consistent with all three fixes being presentational.

**DD-17 — Dibber Dobber's flip 1 is guaranteed a cookie, without breaking the blind commit.** *(Owner call, 3 Aug 2026)*
Flagged in the round-2 write-up and left alone pending a decision: the base game's flip 1
auto-resolves before any choice is offered (correct Incan Gold — you cannot decline to enter the
temple), but Dibber Dobber's first decision of every Raid was made on a totally empty stage, with
no protection at all. Snack Friendly's settings card is hidden in Sylly (its whole point is
guaranteeing early cards are cookies), so there was nothing standing between a brand-new player
and losing 4 of their 5 starting cookies on a move made with zero information.
**Fix:** `cjarBuildDeck()`'s Sylly branch now calls `cjarFloatCookies(deck, 1)` — but only **after**
the branch's own final `shuffle(deck)`, which runs after the Treat is appended. Floating before that
shuffle would have been silently undone by it; the float has to be the last thing that touches the
array.
**This does not weaken the blind commit (Delta 7).** Nothing is revealed before the choice — the
window is exactly as blind as it was. All that changed is which card is guaranteed to occupy
position 0 of an already-random 11-card deck; every Caught! card that would have appeared in a
Raid still appears somewhere in it, just never on the one flip where a player has had zero chances
to learn the rules yet.
**Re-measured against the DD-06/Delta-7 baseline** (`simulate-cjar-dd.js`, 20,000 matches/table
size): 5p spread 34.3 → 31.4 pts, Innocent-leaning win rate 53.5% → 51.4%; 8p spread 37.4 → 37.6
pts, Innocent 52.9% → 52.3%. All movement is within the noise band the same tool already
established for Delta 7 — the flagged imbalance (DD-06) is untouched, which is the correct outcome:
this fix targets a single-flip fairness gap, not the scare-off economics DD-06 is about.
**Harness:** `verify-cjar-deck.js` cannot assert this — it stubs `shuffle` as identity (TG-03),
which deals a family-first deck with zero cookies in the Sylly cut, so `cjarFloatCookies` would
correctly find nothing to float and the assertion would be a false failure of the harness's own
determinism, not of the fix. `verify-cjar-loopback.js` is the one harness with a **real** shuffle
and is where the new check lives: `H2.deck[0].type === 'cookie'` immediately after `startMatch()`
in Sylly mode. 111 → 112.

**DD-16 — The private strip loses Cookie Stash and This Raid outright; they were never needed once the standings moved.** *(Owner call, playtest round 2 second pass, 3 Aug 2026)*
The owner's own diagnosis, mid-round: "since moving the Crumbs, the rest of this information
doesn't need to be stated again — it shows the same info as the score table." Checked against
the code and it's exactly right: `cjarStashVisible(i)` is `cjarOpenBook || idx === mpMyPlayerIdx`
— **unconditionally true for the viewer's own seat**, so `cjarRenderRevealRows` already shows the
viewer's own Cookie Stash and, in the base game, `(+N in)` for the current Raid, at every Open
Book setting. The private strip's Cookie Stash/This Raid chips were duplicating that, not adding
to it.
**The owner also raised the Open-Book-off case directly** — "the only thing I can think of is if
we have Open Book closed, what we should display (maybe just table of 1 — the player)." No new
element was needed: that's already what the standings table does today, because Open Book only
gates *other* players' numbers, never the viewer's own row. Worth stating plainly since it wasn't
obvious from the UI alone — this is a case where the fix was recognising something already worked,
not building something new.
**What remains in the strip is Sylly-only** (Favourite / Watcher / Owes), and the strip hides
itself (`display:none`) entirely in the base game rather than rendering an empty bordered row —
the base game literally has nothing left to put there.
**Screen order changed alongside it:** Stage → standings → Sylly chips → timer → buttons, buttons
fixed at the floor. The owner's framing: "we need to keep this consistent and have the buttons at
the bottom." Every other MDLM game already reads Header → Stage → Controls top-to-bottom per the
Stack; cjar's table screen had drifted into standings *below* the controls, which the reorder
corrects — the timer bar stays directly above the buttons because it is counting down for them.

**DD-15 — The stage becomes THREE COLUMNS, superseding DD-12's three-band layout.** *(Owner call, playtest round 2 second pass, 3 Aug 2026)*
DD-12 fixed the Treat's mislabelled slot and widened the history, but band 2 (the decision) still
had three elements of visibly different sizes sitting in a row with no structural relationship
between them — the owner's read: "with all 3 of different sizes it's causing a visual disconnect."
**CSS grid is the mechanism, not just a styling choice.** `grid grid-cols-3 items-stretch` on the
row means columns 1 and 3 automatically stretch to column 2's (the hero's) content height — no
explicit height math anywhere, which is what makes "combined we've got the height of the stage"
(the owner's own framing) fall out for free rather than needing a hardcoded value that would drift
the moment any card size changes again.
**Column 1 — "on the table":** the Treat slot on top, Crumbs below, `justify-between` spreading
the two across the full stretched height. **The Treat slot is now ALWAYS rendered at a fixed
footprint** — a `.cjar-placeholder-dashed` box at `cjar-card-counter` size when no Treat exists,
the real card at the same size once one appears. This generalises the same idea DD-12 hadn't yet
reached for the Treat specifically: "when no treat has shown up, let's just have a dotted outline
… and then once one is revealed, the art image can take that spot" — no layout jump either way, the
same principle now also applied to the history strip (below).
**Column 2** is unchanged — `just revealed`, still the single largest image.
**Column 3 — "the jar":** the deck bumped again, `.cjar-card-next` 6.5rem → **7.2rem** ("slightly
bigger… important to know"), with the count promoted from `text-xs text-stone-500` to
`text-sm font-bold text-stone-600`. The owner's own suggestion — split column 3 "just like column
one" — is exactly what makes the two-piece stack (card + bolder count) reach column 2's height
without the deck card itself needing to rival the hero, which would have undercut "still the
largest" for column 2.
**The history strip gets the same fixed-footprint treatment its neighbour just established:**
"since at the start there's no card on the history strip, it feels strange seeing that empty
space… we can have a placeholder in the strip until the first card replaces it." One
`.cjar-placeholder-dashed` thumb renders when `spent.length === 0`; the harness's `stageThumbs()`
now filters to the `cjar-card` token specifically (the same distinction `galleryTiles()` already
drew) so it keeps counting *real* thumbs while a new `stagePlaceholder()` check asserts the
placeholder's presence in the empty case.
**One class does both jobs.** `.cjar-placeholder-dashed` (dashed border, transparent fill, no
shadow) is applied to both the Treat slot's empty state and the history strip's empty state —
one visual language for "nothing here yet, but this is where it goes" everywhere the stage needs
it, rather than two bespoke empty-state treatments.

**DD-14 — The card gallery became a How to Play TAB, and the How-to Standard gained one.** *(Owner call, playtest round 2, 3 Aug 2026 — addendum below, second pass)*
DD-09 shipped the gallery as its own overlay, opened by a "See the Cards" button at the bottom
of How to Play. Round 2's call: knowing what cards exist **is** learning the game, so it belongs
*in* How to Play rather than one overlay further away.
**Two options were weighed.** A `[?]` opening a tip modal was rejected — `ui-style.md` rule 2
reserves the header `[?]` for How to Play, and a modal is the wrong pattern for a scrollable grid.
Tabs won: it removes an overlay entirely (7 → 6), removes a z-index stack, and removes an entry
from the `resetToLobby()` teardown list.
**PKO is the precedent for the mechanics, not for the placement.** `pko-chain-overlay` is already
two-tabbed (Diagram | Animals) with a tap-hold that opens it scrolled to a card. But it stays a
*separate* overlay on purpose, and the distinction is now written into the standard: **a mid-play
reference gets its own overlay; teaching material gets a tab.** The chain is something you consult
during a turn; the card gallery is something you read before your first one.
**Three rules earn their place.** The first tab is always the Step cards, so the canonical How-to
structure is untouched. Each tab body is its own `overflow-y-auto` region with its **own** close
button — one shared button would sit at the bottom of whichever body happens to be showing and be
unreachable from the other. And the two bodies are **siblings toggled by display**, not one body
repainted, so flicking across and back keeps the rules' scroll position.
**Harness:** the loopback now drives `cjarOpenHowTo(tab)` rather than `cjarOpenCards()` directly
and asserts which body is showing, because the tab switch is the part that can now break. 108 → 110.

**Addendum (second pass, same day) — the menu's own gallery button was removed, and the gallery
grid was fixed to a deliberate 3-then-2.** The first pass kept `btn-cjar-menu-cards` on the game
menu as a shortcut into the gallery tab, reasoning it protected the offline install check. The
owner's read: it made the menu **five** buttons where the Universal Menu Standard fixes every
other game at four, and having just moved the gallery *into* How to Play, a second doorway to the
same place undercut the point of moving it. Removed; the offline check now reads exactly what
every other game's does — How to Play → the tab that shows the art — with no special-cased
shortcut. Separately, the gallery's tile rows were `flex flex-wrap`, which put Family (5 tiles)
and Treats (5 tiles) at 4-then-1 purely as a function of how many tiles the container's measured
width happened to fit — not a choice, an accident of layout. Switched to `grid grid-cols-3`, which
wraps 5 tiles as a deliberate 3-then-2 regardless of container width.

**DD-13 — Settings pills carry the thematic name; the VALUE gets its own live line.** *(Owner call, playtest round 2)*
Decision Time shipped as `Blitz / Standard / No Rush` with the actual seconds written **nowhere in
the app**, while Match Length baked its values into the labels (`Quick Snack (3)`). Same gap, two
different wrong answers.
**Why not just append the value to every label:** it lengthens pills unevenly and wrecks the row's
alignment, and it puts pressure on thematic setting names — which are close to a suite signature —
to also be self-documenting. Those two jobs fight.
**The pattern already existed, for sliders only.** The Sylly intensity slider has carried a live
`text-stone-400 text-xs` descriptor since LI5/GM. This generalises it to pill groups rather than
inventing anything: same class, same job, one row lower.
**The static description above the pills stays, and keeps its own job** — it says what the setting
*controls* and is the only thing to read before a choice is made; the new line says what you just
*picked*. Making the existing line dynamic would have lost the first, which is why that option was
rejected.
**Rule as written into `ui-style.md`:** required when the option encodes a concrete value not
visible in its label (durations, counts, thresholds, percentages); optional otherwise, so an
ON/OFF toggle whose description already explains it does not acquire a redundant line.
**Scope:** cjar is the reference implementation. **The other 17 games are NOT swept** — that is a
separate pass, deliberately not folded into a playtest-fix batch.

**DD-12 — The stage is THREE BANDS, because one row was doing three jobs.** *(Owner call, playtest round 2, 3 Aug 2026)*
DD-11's single row fixed the duplication it was built to fix, but round 2 found it still did not
read. The arithmetic says why: on a 390 px phone the Stack's column is ~350 px, and the row spent
136 (hero) + 56 (deck) + 16 (gaps) = 208 of it, leaving the trail **142 px — 2.6 thumbs of a Raid
that runs 10+ flips**. It *was* `overflow-x-auto`, so it technically scrolled; it just had no room
to, and `strip.onclick` opened the Crumb Trail overlay, so the swipe that would scroll it competed
with a tap-to-open handler. The history read as unscrollable because functionally it was.
**The size progression was also backwards.** 48 px thumbs / 136 px hero / 56 px deck reads as
"small small small **BIG** small" — the *next* card, the actual object of the bet, rendered nearer
to the spent cards than to the live one. New `.cjar-card-next` at 6.5rem sits deliberately close to
`.cjar-card-stage` and nowhere near `.cjar-card-thumb`.
**Three bands, one job each:** table state (Crumbs) → the decision (just revealed + next + any
Treat) → the history (full width, ~6.5 thumbs, real scroll room). The strip lost its click handler
entirely; `btn-cjar-trail-open` beneath it is the affordance, so a scroll container is only ever a
scroll container.
**Crumbs moved out of the private strip, and that was not cosmetic.** The strip read
`Crumbs 1 🍪 · Cookie Stash 0 🍪 · This Raid 2 🍪` — and the owner could not tell what the last two
were. The reason is that **one of those three is not like the others**: Crumbs is shared table
state up for grabs, the other two are personal. Putting all three in one undifferentiated row of
identical chips actively hid the distinction. Crumbs went to the stage (band 1, where table state
belongs), leaving the strip to hold only *your* numbers — and those two are now told apart by
shape rather than by reading: a **filled** chip is banked and safe, an **outlined** chip is
provisional and still at risk. The `[?]` moved with them and now explains Stash-vs-Raid, which is
the question that was actually asked.

**DD-11 — The stage is now ONE ROW: past → just-revealed → unknown.** *(Owner call, playtest round 1, 3 Aug 2026 — SUPERSEDED IN PART by DD-12)*
**The complaint:** "the visual of the card on top is confusing, because it seems like it's
displaying the card we have to make a decision on." Correct diagnosis. The hero rendered
`cjarCard` at `15rem` directly above a trail strip whose **rightmost thumb was the same
card** — so the newest card was drawn twice, and the larger copy occupied the spot the eye
reads as "the thing under decision" when it is in fact the card that already resolved.
**The fix is structural, not cosmetic.** The hero stopped being a separate element: the
newest revealed card *is* the strip's right-hand entry, drawn at a new `cjar-card-stage`
size, and the face-down deck closes the row. `cjarRenderTrailStrip` now renders
`cards.slice(0, -1)` whenever a card is face-up, so nothing is ever drawn twice. The row
reads left→right as **what's come out → just revealed → next**, with a label strip under it,
and the deck is where a bet physically points.
**A size drop that improves quality.** `15rem` → `8.5rem` (240 → 136 CSS px) makes the 360 px
art go from ~1.1× effective to ~2.6× (TG-02b's crop maths). The card the owner was told was
"clean but soft" gets sharper by shrinking, so no art rework is needed. `cjar-card-hero`
stays at 15rem — the gallery uses it.
**The animation earns its place:** `cjar-card-flipin` (260 ms, `rotateY` + `translateX`,
`perspective` on the row) fires *only when the card key changes*, because `cjarRenderTable`
runs on every submission and an unconditional animation would re-flip the same card each
time anyone tapped. The previous card's demotion is sold by `cjar-trail-settle` on the newest
thumb rather than by a real FLIP transition between two parents — same read, none of the
bookkeeping. Both are transform/opacity only and inherit the global reduced-motion block;
neither uses `animationend`, so nothing can be left stranded.
**Standings became persistent in the same pass.** `cjarRenderRevealRows` only rendered during
`'revealing'`, so Open Book was ON but there was nowhere to see where you stood *while
deciding* — the one moment it is worth anything. It now renders in every phase: rank + name +
Stash while deciding (sorted into a ladder, own row tinted, `🚪` on seats that have left),
swapping to the per-player line + delta during the reveal.

**DD-10 — Decision Time is a setting, and No Rush genuinely removes the clock.** *(Owner call, playtest round 1)*
15 s measured too short at a real table. Rather than pick a new number, it became a pill group:
**Blitz 10 s · Standard 20 s · No Rush (none)**. Standard is deliberately *above* the old
value, not equal to it — the complaint was that the middle ground was wrong, so keeping 15 s
as the middle would have shipped the same problem with more options around it.
**"Campaign" was rejected** as the third label: it reads as match length, which cjar already
has (Quick Snack / Full Feast). "No Rush" says what it does, which matters most for the
audience the option exists for.
**Two things that make No Rush safe rather than a hang:** `cjarAllIn()` was *already* the only
gate — the host timeout was never the mechanism, only a safety net — so removing it changes
nothing structural. And the timer bar is **hidden outright** rather than left full: a
full-but-frozen bar reads as a broken timer.
**One trap worth naming:** the window length must travel **per flip** (`windowMs` on
`CJAR_FLIP_START`), not be read from the local setting. A client whose own pills say something
else must still scale its bar against the host's clock — and because `null` is erased by the
wire (BUG-06), its *absence* is exactly the signal that means No Rush. `cjarDecisionMs()`
returns `null` rather than falling back to a number, so a caller that forgets to branch fails
loudly instead of silently re-arming the auto-resolve.

**DD-09 — A card gallery, and why an MDLM-only game needs one more than most.** *(Owner call, playtest round 1)*
The owner went to run the offline install check and found the artwork does not appear until
you are *inside a match* — which for a 3–8 player MDLM-only game means the check needs four
phones and a Firebase room to verify something that is purely a service-worker question.
The instruction they were given ("open Settings and How to Play") was simply wrong: those
overlays are text.
**`cjar-cards-overlay` fixes the check and the game at once.** It builds from `CJAR_DATA` on
every open — 3 cookie tiers, 5 family, 5 treats, the back — so it cannot drift from the deck
the way a hand-written list would, and every tile goes through `cjarRenderCard`, so the art
seam stays the only way a cjar card reaches the DOM. Reachable from the game menu and from
inside How to Play mid-match; **not** from a second header `[?]`, because `ui-style.md` rule 2
reserves that for How to Play.
**Only 3 of the 15 cookie values are shown** — the art collapses 15 values onto 3 tier assets
with the number as a text overlay, so a 15-tile row would be 15 copies of 3 pictures.
**The harness asserts 14 tiles = the 14 shipped art files.** Add a manifest key without a
gallery tile and that number stops matching, which is what keeps the offline check honest.
First gallery in the suite; the other art games have the same need and the same seam (deferred).

**DD-08 — The lobby minimum drops 4 → 3.** *(Owner call, playtest round 1, 3 Aug 2026)*
`getMinPlayers: () => 3` in `MP_GAME_CONFIGS`. The spec fixed the range at 4–8; the owner
wanted the Incan Gold range. Nothing mechanical objects — the deck (31 cards, 5 families ×
3 copies), the bust odds, `cjarSplit`, the Treat schedules and the Dibber Dobber affinity
draw are all player-count independent, and the loopback now plays a full 3-player match
(both a base match and the seat-length rebuild that `cjarWireArr` performs on the client).
**What IS affected and is not measured:** the solo-Sneak-Out jackpot sweeps the whole Crumb
pool, and at 3 seats it lands far more often than at 5 or 8 — the two table sizes
`simulate-cjar-dd.js` actually ran. **3-player balance is unsimulated.** Carry it as a
round-2 watch item alongside DD-06 rather than pre-emptively tuning it.

**DD-07 — cjar's game-menu buttons were the only ones in the suite at the wrong type scale.** *(Playtest round 1)*
How to Play and Settings shipped at `text-base`, Back to the Box at `text-sm font-semibold`.
Every other game — checked against PKO, FLW, SHP, FRT, NT and PASS, unanimous — uses
`text-xl font-semibold` for the two secondary CTAs and `text-base font-medium` for Back.
Corrected. The Universal Menu Standard in `ui-style.md` specifies the four buttons, their
order and their colours but **not their type scale**, which is how this slipped past a build
that was otherwise following it; the standard now carries the sizes (see § Universal Menu
Standard). Worth a glance at any future game's menu against a shipped one, because the
divergence is invisible in isolation and obvious side by side.

**DD-01 — The fifth family archetype is Grandma, not Little Brother.** *(2 Aug 2026, Task 3)*
**What happened:** The confirmed spec's fifth archetype was `little` / "Little Brother" 🧒.
The delivered core art contained `grandma.png` and no younger-child card.
**Root cause:** The owner could not get usable art generations of young children. Rather
than ship a card whose art contradicts its name, the archetype became Grandma — `id:
"grandma"`, name `"Grandma"`, emoji 👵.
**Lesson:** The archetype identity is a **pure data key** — no mechanic branches on which
family member a card is, only on `copies` and on first-vs-second appearance. So the swap
cost nothing structurally: `copies` stays 3, deck composition, bust odds and the Snack
Friendly float are all untouched. What it *did* cost was eight flavour lines and a
personality brief, because Grandma's register is genuinely different from a younger
sibling's — she is not trying to catch you, she is delighted to see you and is going to
make this take much longer than you wanted. **Generalisable point: check the delivered art
against the spec's content keys before authoring flavour copy, not after.** Doing this at
Task 3 cost one question; discovering it at Task 16 would have meant rewriting the data
file, the content guide, the harness assertion and two doc sections.
Recorded as plan Delta 5. Task 17 must carry it into `game-identities.md` and the decision log.

**DD-02 — `cjarShuffle` was never written; the engine's `shuffle` is reused.** *(Task 1)*
Spec §10 listed `cjarShuffle(arr)` as an in-place Fisher–Yates helper. `js/engine.js`
already has a **pure** `shuffle(arr)` that returns a copy. Writing the plugin version would
have duplicated an engine primitive (Protocol A flags this). Consequence to honour at every
call site: **`deck = shuffle(deck)`, never `shuffle(deck)` as a bare statement** — the
latter silently does nothing. Bonus: the harnesses stub `shuffle: a => [...a]`, which makes
every deck build deterministic for free. Recorded as plan Delta 1.

**DD-03 — A revealed card's effect resolves BEFORE the decision window.** *(Task 1, plan Delta 3)*
Spec §6.4 read literally puts `cjarResolveFlip` after the card is revealed *and* the window
has closed, which would let a player look at a second Caught! card and Sneak Out for free,
or look at a 17-cookie card and always Take. Push-your-luck requires the card to resolve
first and the choice to be about the *next* one. Split into `cjarApplyCardEffect()` (pops,
applies, returns `{ busted, bustFamilyId }`; a bust skips the decision window entirely) and
`cjarResolveFlip(choices)` (choice resolution only, returns `{ deltas, lines, raidEnded }`).
The spec's own packet table confirms it — `CJAR_FLIP_START` carries post-effect state.
Does **not** apply in Dibber Dobber, where §6.3 makes every outcome choice-driven.

**DD-04 — High Alert can re-pick the family that just burnt, cancelling itself out. RESOLVED 2 Aug 2026 — option (a), exclude it.** *(Raised Task 6, fixed Task 12)*
**Owner decision:** exclude the busting family from the escalation pool. `cjarResolveBust` now
filters `id !== familyId`, plus an empty-pool guard (unreachable in a real match, but it would
otherwise write `cjarFamilyCopies[undefined]` and poison the deck). Code now matches the spec's
prose, and High Alert always does something. A new assertion —
`escalation never re-picks the busting family` — makes the rule the harness's contract, and
**all six seeds tested now pass** where seed 0 previously failed two checks. Recorded as plan
Delta 6; Task 17 must reconcile the spec's own `cjarResolveBust` block. Original analysis:
**What happens:** `cjarResolveBust` burns the busting family (3→2), then picks the High Alert
family from *all* families with `copies > 0` — **including the one that just burnt**. When it
re-picks that family she goes 2→3, i.e. straight back to baseline. Net effect for that Raid:
nothing burns and nothing escalates. With 5 archetypes that is **1 bust in 5**.
**Why it is not a code bug:** the implementation is character-for-character the spec's own
`cjarResolveBust` (`docs/new-game-tech-cookie-jar.md:319–331`). The *code* is faithful.
**Why it is still wrong:** the spec's prose and its own comments contradict that code —
`cjarHighAlertId` is documented as "family id escalated to **4 copies**" (spec:200), the line
itself is commented "a **4th copy** next Raid" (spec:325), and §Settings describes High Alert
as making someone "*more* likely" (spec:253). None of those hold in the re-pick case.
**How it was found:** the loop harness pins `Math.random` via `__rand` (deliberately, so the
draw is deterministic). Re-running the whole harness across seeds 0 / 0.25 / 0.5 / 0.75 /
0.999 / real showed **seed 0 fails two assertions** — `escalated family has 4 copies` gets 3,
and `the busting family still burns` gets 3. Every other seed passes because `pool[0]` is
`mum`, the family the test busts. So the green tick is a property of the chosen seed, not of
the rule.
**The two options:** (a) exclude the busting family from the escalation pool — one `.filter`,
makes code match prose, guarantees High Alert always does something; (b) keep it and correct
the spec's prose to say escalation may land on the just-caught family and cancel out.
**Left as-is pending the call** — this changes a game rule, which is not a decision to make
inside an implementation task. Nothing downstream depends on the answer; the fix is one line
whenever it is made.

**DD-06 — Pre-playtest balance baseline, and one FLAGGED item: Play Innocent dominates. NOT retuned.** *(Task 9)*
`tools/simulate-cjar-dd.js` is the spec §17 D-11 mitigation — the Sylly numbers were tuned at a
16-card deck and ship at ~11. **Mean deck size reads 11.00**, confirming `CJAR_DD_CUT` + the
Treat-after-cut ordering are intact.

**Baseline readings (record these; compare playtest against them, do not chase them):**

| Reading | 5 players | 8 players | Threshold |
|---|---|---|---|
| Win-rate spread | **33.1 pts** | **37.9 pts** | ~12 pts — **BREACHED** |
| Take / Innocent / Dob lean | 35.0 / 40.0 / 25.0% | 35.0 / 39.9 / 25.1% | 33.3% each |
| Debt pinned at cap | 12.7% | 15.1% | ~25% — fine |
| Treats claimed | 97.0% | 88.8% | ≥40% — fine |
| Win rate: Take / Innocent / Dob | 28.3 / **52.4** / 19.3% | 15.0 / **52.9** / 32.1% | 33.3% |

**The flagged item:** Innocent-leaning wins ~52% at both table sizes — a 33–38 pt spread against
a 12 pt threshold. Stable across player count, so not noise.

**Diagnosis, and a hypothesis that the data killed.** The obvious suspect was the Treat's
uniquely-solo rule. A pure-strategy probe supported it spectacularly — a lone Innocent among
four Takers wins **100%** of matches with mean Stash **249 vs 4.4** (~57×), and a lone Taker
among four Innocents wins 100% at 196.6 vs 16.2, because a permanently-solo seat claims every
Treat. But a mechanism probe on *mixed* play disconfirmed it as the realistic cause:
Innocent-leaning wins 52% while holding the **fewest** Treats (0.71/match vs 1.11 for
Take-leaning), Treats are only **18%** of all points, and the match winner held the most Treats
in just 44.7% of matches.

**Both modes now share one mental model (Delta 7, 2 Aug 2026).** An earlier version of this
entry blamed the dominance on DD being an *informed* choice — you could see it was Mum and Play
Innocent for free. That was true of the spec's original §6.3 structure and is **no longer the
case**: DD now commits blind and reveals at resolve, so both modes are a gamble on an unseen
card. The dominance is unaffected, which is the important finding — **it was never about
information**, it is pure scare-off economics, and the simulator's card-blind agents were
measuring exactly that all along. Re-measured post-Delta-7: spread 33.1 → 34.3 pts, Innocent
52.4% → 53.5%. Noise.

So there are two separate effects, and only the first matters at a real table:
1. **The scare-off is the engine.** Playing Innocent is risk-free — an Innocent never pays on a
   Caught! card — *and* sweeps the entire accumulated Crumb pool whenever no Dobber is present.
   Since every remainder in the game drains into Crumbs, Innocents harvest the whole game's
   rounding for free. Dob is the designed counter (its presence denies the pile on both card
   types) but it is punished hard enough — always backfires on a Family card, backfires on a
   Cookie with no takers — that it is under-played and rarely denies.
2. **Coordinated solo-farming** is degenerate but requires the table to deliberately leave one
   player alone in a bucket, which self-corrects socially.

**Deliberately NOT acted on.** The plan forbids retuning in Task 9, and rightly: changing a
number now leaves nothing for playtest round 1 to be compared against. Carry this as the
round-1 watch item — *does the table actually converge on Play Innocent, or does social
pressure produce the Dobs the simulation's fixed weights never will?* If it does need a lever,
the candidates are the scare-off's unconditional full-pool sweep and the Dob backfire's
severity, **not** the Treat rule.

**DD-05 — The Dibber Dobber ledger invariant: `held = Σ cjarStashes + cjarCrumbs`. Crumb Debt is NOT held value.** *(Task 8)*
Worth stating explicitly because it is easy to get wrong — it was gotten wrong twice while
building the Task 8 stress test before the right model fell out.
**Debt is a side-ledger, not a negative balance.** `cjarDDPay` moves what the player *can* pay
from their Stash into Crumbs (a transfer — `held` unchanged) and records the shortfall as debt.
No value moves for the shortfall. `cjarDDGain` then diverts future gains into Crumbs until the
debt clears. So debt only ever *redirects* value; it never holds any. Subtracting it from
`held` double-counts on repayment and makes every flip look like a leak.
**Two consequences that matter:**
- Per **flip**, `held` is conserved exactly: `held_after == held_before + cookieValue +
  claimedTreatPoints`. Verified across 87,846 flips.
- Across a **Raid boundary** it is deliberately NOT conserved. `cjarEndRaid`'s Sylly branch
  zeroes `cjarCrumbs` and forgives all `cjarCrumbDebt`. Leftover Crumbs are destroyed and debt
  is written off every Raid — by design, and the reason a per-match conservation check is
  meaningless.
- The `CJAR_DD_DEBT_CAP` does **not** destroy value either. It caps how much future gain gets
  diverted; the payment itself is unaffected.

---

## Bug Index

**BUG-11 — All-innocent Dibber Dobber flip threw its payout token the wrong way.** *(Final review of the action-stage rework, 8 Aug 2026 — FIXED)*
**What happened:** `cjarBeginFlipAnim`'s payout beat had a comment claiming the "dobbers-only or
all-innocent" case sends every cookie to Crumbs and "never to a seat" — true for dobbers-only, but
`cjarResolveFlipDD`'s scare-off (which runs LAST specifically so an all-innocent flip absorbs its
own contribution immediately) actually sweeps the whole pool straight back out to the innocents.
The beat threw one token **left** to the Crumb pile — visually the opposite of what the code it was
supposed to be narrating actually does.
**Root cause:** the payout beat and the resolver it mirrors were written by reading the resolver's
branch structure, not its comments, and the scare-off's own "runs LAST" comment was the tell that
got missed — a pile that gets refilled and immediately drained in the same function never *stays*
refilled from the outside.
**Fix:** added the missing branch — `innocents.length && !dobbers.length` throws one token per
innocent, downward, no remainder.
**Lesson:** when a visual beat mirrors a resolver's math (DD-20's whole point), audit it against
every branch of the resolver, not just the branches a quick read makes obvious — a function whose
own comment says "runs last" is a sign its outcome depends on what already happened, not just what
this branch does.

**BUG-10 — A quit mid-bust-window left the client's timeout un-clearable.** *(Final review of the
action-stage rework, 8 Aug 2026 — FIXED)*
**What happened:** the host's bust-path `cjarShowBusted` timeout was tracked in `cjarRevealHandle`
(cleared by `cjarResetState`); the client's identical timeout, added by the same rework, was a bare
`setTimeout` with the return value discarded. A client that quit, or received `HOST_END_GAME`,
inside the 2100 ms bust reveal window still had `cjarShowBusted` fire later — sound, `showScreen`,
a fresh 5 s interstitial — against a screen the app had already torn down.
**Root cause:** the host and client bust paths were written as near-duplicates (same beat, same
delay), but only the host's copy carried the tracked-handle pattern the rest of the file uses
everywhere else; the client copy was new code that didn't inherit it by osmosis.
**Fix:** the client timeout now lives in `cjarRevealHandle` too (unused on clients otherwise, since
`cjarHostNextFlip`/`cjarHostResolveFlip` both bail out early on `syllyMultiplayerMode === 'client'`),
cleared by the same `cjarResetState` line as the host's. Also closed in the same pass: `cjarResetState`
now empties `#cjar-delta-layer` directly — a mid-flight quit hides the screen via `display:none`,
which suppresses `animationend`, so in-flight token nodes from `cjarFlyTokens` had no other cleanup.
**Lesson:** when a new code path duplicates an existing one's *behaviour*, check it also duplicated
the existing one's *bookkeeping* — the timing and the callback were copied correctly; the handle
tracking was not, because it left no visible symptom until a device happened to quit in a 2.1 s window.

**BUG-09 — The just-revealed card was reachable from nowhere for the whole decision window.** *(Final
review of the action-stage rework, 8 Aug 2026 — FIXED)*
**What happened:** `cjarRenderTrailStrip`'s exclusion gate (`cjarCard ? cards.slice(0, -1) : cards`)
predates this rework, written when the hero *showed* `cjarCard` face-up for the whole window — the
gate existed only to stop the strip from also drawing the same card. DD-18 made the hero go
face-down again at the 2100 ms handover, but `cjarCard` stays truthy for the entire decision window
that follows — so from the handover until the flip resolves, the card was in the hero only as a
generic back, not in the strip, and (for a cookie) not on the warning strip either. The only way to
see what had just been revealed was the trail overlay, one tap away — directly contradicting DD-18's
own justification, repeated verbatim in the code comment one screen up.
**Root cause:** the gate's condition (`cjarCard` truthy) was never actually "is this card currently
the hero" — it was "has a card been dealt this flip", which used to be the same thing and stopped
being the same thing the moment the hero started going face-down mid-window.
**Fix:** gated on `cjarFlipAnim && cjarCard` instead — the strip now includes the card exactly when
the hero stops showing it, which is also the moment `cjar-trail-settle`'s fires (a fix and a missing
animation trigger from the same one-line change).
**Lesson:** a boolean gate written against "has X happened" quietly drifts from "is X still true"
the moment the thing it gates stops being a one-way transition — worth re-checking any gate that
predates a change to the state it reads.

**BUG-08 — The "card stuck under the next one" was the Treat, and the mechanic was working.** *(Playtest round 2, 3 Aug 2026 — FIXED, SW v160)*
**What the owner saw:** after a few reveals, a second card appears below the deck in the "next"
slot — top is the normal cardback plus its count, bottom is a card that differs each Raid and
then *stays there* into following flips. Reported as a rendering leak.
**What it actually was:** `cjarRenderStage` appended **two different things into the same 56 px
column**. `cjar-deck-badge` got the face-down deck card and its count, and then, unconditionally,
`if (cjarCounterTreat) badge.appendChild(...)`. So the bottom card was the revealed **Treat sitting
unclaimed on the counter** — different each Raid because the Treat is scheduled per Raid, and
persistent across flips because that is precisely its rule: it sits there until someone Sneaks Out
alone and claims it.
**So there was no leak, no stale node and no `innerHTML` bug** — the render loop was correct and
every harness was right to pass. The defect was that the single most valuable object on the table
was drawn as an unlabelled thumbnail wedged under the deck, **in the slot that means "next"**,
where it could only read as debris.
**Fix:** the Treat gets its own slot on the stage with its own label ("on the counter"), and the
deck column renders the deck and nothing else.
**Lesson — the one worth keeping:** a bug report of the form *"there's a stray element"* is worth
checking against the possibility that the element is **real state with no home**. Both look
identical on screen. The tell here was that it changed per Raid and persisted across flips —
neither is how a render artefact behaves, and both are exactly how the Treat behaves. Reading the
renderer before reaching for a teardown fix is what turned a suspected leak into a layout answer.

**BUG-06 — Every client froze on the Raid 1 intro: Firebase erased the reset values.** *(Playtest round 1, 3 Aug 2026 — FIXED, SW v158)*
**What the owner saw:** four devices joined, the host played the entire match alone. Only
the host moved past the Raid intro; clients had no buttons, and the host's summary screen
listed all four players (real host-side numbers, so it looked like the others were being
scored but never playing).
**What actually happened:** `CJAR_MATCH_START` and `CJAR_RAID_START` applied fine — neither
renders anything. `CJAR_FLIP_START` then threw inside `cjarRenderWarningStrip` at
`cjarSeen[f.id]`, **one line before `showScreen('screen-cjar-table')`**. The exception
escaped through `mpHandleEnvelope`, so the client never navigated — and every later packet
re-threw at the same place, which is why a client was stuck for the whole match rather than
for one flip.
**Root cause — the wire, not the logic.** Firebase RTDB **stores no `null`, no `{}` and no
`[]`**. A key holding any of those is deleted and reaches the reader as `undefined`; an array
whose entries are all `null` vanishes whole; a half-dense one comes back as an **object keyed
by index**, not an array. cjar broadcasts its reset values *explicitly* — the FLW BUG-01
discipline, and the right instinct — but its reset values are exactly the erasable shapes:
`seen: {}`, `trail: []`, `choices: [null,null,null,null]`, `counterTreat: null`,
`highAlertId: null`. All five were erased in flight on every single packet.
`[false,false,…]`, `[0,0,0,0]` and `''` were never at risk: `false`, `0` and the empty string
are legitimate stored values. **Only emptiness is erased.**
**Why 222 green checks plus a loopback all missed it — two independent blind spots:**

1. The Task-15 loopback piped the host's `mpSendEnvelope` **straight into** the client's
   `cjarHandleEnvelope`. Payloads travelled as live JS references, so `{}` was still `{}`
   on arrival. It proved the packet *contract* and could not, by construction, see the
   *transport*.
2. All three verifiers mock the DOM as `getElementById: () => null`, which short-circuits
   every `if (!el) return` guard — so **not one line of render code executes** in any of
   them. The throw was in render.
**Fix:** three normalisers (`cjarWireArr` / `cjarWireList` / `cjarWireObj`) at the top of
`cjar.js`, applied to every collection field in all five SYNC appliers. `cjarWireArr` takes
the seat count and a fill value and reads `v[i]`, so it repairs the erased-array, the
null-hole and the came-back-as-an-object cases in one pass. This is where the rest of the
suite already is — PKO, FLW and SHP all default their payload collections with `p.x || []`.
cjar had **zero** such defaults; that was the drift.
**One deliberate branch:** `cjarActive` is normalised to `[]` in Dibber Dobber, because DD
genuinely has no active array (BUG-05) and rebuilding it as all-false would be inventing
state. Every read of it is already `cjarIsSylly()`-guarded, so this is belt-and-braces.
**How it was found:** `tools/verify-cjar-loopback.js` (below) — a rebuilt loopback with a
`fbWrite`/`fbRead` pair that reproduces Firebase's erasure, and a DOM mock made of **real
elements** so render code actually runs. It reproduced the freeze on the first run and was
verified to fail against a normaliser-stripped copy of `cjar.js` (via `CJAR_SRC=`) before
being verified to pass against the fix.
**Lesson:** a payload field whose *reset value* is empty is a field that does not arrive.
The safest broadcast carries reset values explicitly **and** the safest applier rebuilds
them on receipt — you need both halves, and the second half is invisible to any harness
that does not put a real wire between the two devices.

**BUG-07 — The lobby dropped the host back on the game menu instead of into Raid 1.** *(Playtest round 1, FIXED)*
Tapping "Raid the Jar!" in the lobby landed on `screen-cjar-menu`, where the host had to tap
"Raid the Jar!" **again** to actually start. cjar's `onPassThePhone` called `cjarShowMenu()`.
**Root cause was a misread of the rule, not an oversight.** `logic-engine.md` § MDLM Patterns
documents the game menu's Play CTA as having "dual context" — pre-lobby it opens the mode
screen, post-lobby it starts the match — and names GTH as the reference. That is true of the
*CTA*, but **GTH itself does not route through the menu post-lobby**: its `onPassThePhone`
calls `gthStartSession()` with the comment "settings already locked from lobby — skip menu
re-visit". Checked across every MDLM game: GTH, FRT, SHP, FLW and PKO all go straight into
play; BLD, DYB and PASS go to a seating screen they genuinely need. **cjar was the only game
that bounced back to its own menu.**
**Fix:** `onPassThePhone` → `cjarStartMatch()`. The dual-context branch on
`btn-cjar-menu-play` is kept as a defensive fallback exactly as FRT/SHP/FLW/PKO keep theirs.
`cjarShowMenu()` would have become dead code, so the lobby entry button now calls it instead
of `showScreen` directly — one entry point rather than an orphan.
**Lesson:** the settings are locked in *before* the lobby (menu → Settings → Play → mode
screen → host lobby), so a post-lobby menu visit offers nothing and costs a tap on a screen
the host has already seen. When a rule names a "reference implementation", read the reference
— the prose described the CTA's two contexts and was silently read as a recommendation to
use both.

**BUG-01 — The flavour-line distinctness test passed only because of a pinned seed.** *(Task 6, harness defect, FIXED)*
**What happened:** `cjarFlavourLine draws without replacement within a Raid` asserts four
draws yield four distinct lines. It reached that section with **2 of Mum's 4 warn lines
already consumed** by the earlier family-card sections, so the four draws straddled a pool
reset and distinctness was not actually guaranteed.
**Root cause:** the section assumed a Raid-fresh pool but never established one; it survived
only because `__rand` was still pinned at `0.5` from the High Alert section above it.
Measured: under real randomness that variant fails **1666/2000 runs (83%)**. On a Raid-fresh
pool it holds at every seed tested.
**Fix:** added `resetLines()` to the harness bridge and called it at the top of the section,
so the test exercises the Raid boundary it claims to. Verified seed-independent afterwards.
**Lesson:** a harness that pins `Math.random` for determinism buys reproducibility and loses
the ability to notice that an assertion is seed-dependent. Worth re-running any such harness
across several seeds once — it is how both this and DD-04 surfaced, and neither was visible
from a green run at the default seed.

**BUG-05 — `cjarAllIn()` was vacuously true in Dibber Dobber: every flip resolved on the FIRST tap.** *(Found Task 15, FIXED)*
**What happened:** `cjarAllIn()` was `cjarActive.every((a, i) => !a || cjarReadyCheck[i])`. In
Dibber Dobber `cjarActive` is deliberately **empty** (spec §6.3: "no `cjarActive`"), and
`[].every()` returns **`true`** — so the gate was always open. The host resolved the moment the
first player submitted, and seats 2..N never got to choose at all. The entire
simultaneous-choice mechanic was broken in Sylly Mode.
**Root cause:** the gate was written for one mode and applied to both. The plan's Global
Constraints correctly warned about the *opposite* hazard — "plain `.every(Boolean)` freezes every
base-game Raid the moment anyone Sneaks Out" — and got the base-game form right, but nothing
checked what that form does against an empty array. **Both forms are wrong in the other mode.**
**Fix:** branch on the mode. Sylly uses `cjarReadyCheck.every(Boolean)` (nobody ever leaves, so
every seat must be in); the base game keeps the active-seats form.
**How it was found — and why nothing else could have:** a two-device host↔client loopback, with
the host's `mpSendEnvelope` piped into a second vm's `cjarHandleEnvelope`. The tell was
Dibber Dobber emitting **two** `CJAR_FLIP_RESOLVE` packets where the base game emitted one.
Neither existing harness can see it: `verify-cjar-dd.js` calls `cjarResolveFlipDD` directly and
never routes through the gate, the loop harness's `cjarAllIn` section is base-game only, and the
Task 13 full-match driver submits *all* seats before resolving, so it never exercises a partial
submission. A regression test was added and **verified to fail against the pre-fix code**
(`nobody in yet` and `three of four in` both returned `true`).
**Lesson — generalisable:** `[].every()` is `true`. Any readiness/consensus gate that reads a
per-seat array must be checked against the mode where that array is empty by design. And a
"both modes share this helper" derived function deserves an explicit assertion per mode, not one.

**BUG-04 — Dibber Dobber's Crumb Trail was empty for an entire match.** *(Found Task 13b, FIXED)*
**What happened:** the Sylly path in `cjarApplyCardEffect` returned before reaching any
`cjarLogTrail` call — zero trail entries in Dibber Dobber, so the trail strip on the table and
the whole Crumb Trail overlay were blank all game. Confirmed by grep (0 `cjarLogTrail` calls in
the Sylly branch) and by a driven match.
**Root cause:** the trail was logged inside the *reveal-time effect*, and Sylly deliberately has
no reveal-time effect. The two concerns were coupled: "apply the card's effect" and "record that
the card happened" are not the same job, but they lived in the same branch.
**Fix:** Delta 7 moved DD's reveal into `cjarRevealSyllyCard()`, which logs the entry as it pops.
Verified: 0 → 11 entries over a driven 3-Raid match, no `null`/`undefined` in the rendered log.
**Also fixed on the way past:** a DD cookie entry has no per-head share (it depends on how many
players chose Take, which is unknown at log time), so `per` is omitted and the trail renderer now
prints the bare value. Without that guard the log would have read `🍪 14 cookies — null each`.
**Lesson:** logging belongs with "the card was revealed", never with "the card's effect ran" —
a mode that skips the effect must not silently skip the history.

**BUG-03 — An all-square match labelled every player both "Top Cookie Thief" and "Red-Handed".** *(Task 13, FIXED)*
**What happened:** driving a full 3-Raid match end to end, all four players finished on 3
cookies. `cjarRanks()` correctly returned `[1,1,1,1]` — joint winners. But `cjarRedHanded()`
takes `Math.max(...ranks)`, which in an all-square match is **also 1**, so it returned every
seat. The end screen then rendered `🍪 1st — Ali · Top Cookie Thief · Red-Handed` — the same
row simultaneously best and worst.
**Root cause:** "last place" was defined as "shares the highest rank number", which is only
meaningful when some seat does *not*. An all-square match has joint winners and **no** last
place; the code had no concept of that.
**Fix:** `cjarRedHanded()` returns `[]` when `max(ranks) === min(ranks)`. Two harness
assertions added — nobody Red-Handed when all four tie, and a genuine shared last place
(`[9,9,2,2]` → `[2,3]`) still reports, so the guard is not too broad. Re-verified across 300
full driven matches: zero contradictory rows.
**Lesson:** a "worst place" derived from `max()` over a rank array needs an explicit
all-equal guard. This was invisible to every unit-level check — the tie-break section already
tested shared ranks and passed — and only appeared when a **whole match** was played to the
end screen. Worth driving a full match through the real screen functions before shipping any
game's ranking, not just unit-testing the ranker.

**BUG-02 — The decision timer would have drained from both ends at once.** *(Task 12, FIXED)*
`cjarStartTimer` animates the fill with `transform: scaleX(n)`, which is the right choice —
transform is GPU-composited and the Motion Standard forbids animating `width`. But
`#cjar-timer-fill` had no `transform-origin`, and the CSS default is `50% 50%`. A countdown
would therefore have shrunk symmetrically toward the centre, reading as a shrinking pill
rather than a bar draining away. Fixed with a `#cjar-timer-fill { transform-origin: left;
will-change: transform; }` rule in `css/styles.css`.
**Lesson:** any `scaleX`/`scaleY` progress indicator needs an explicit `transform-origin`.
The bug is invisible in code review — the JS is correct in isolation — and invisible to a
headless harness, because nothing throws. It only shows on screen, which is exactly the class
of defect a DOM-mock substitute for a browser walk will *not* catch either; this one was found
by reasoning about the CSS default, not by running anything.

**Also fixed in Task 15 (plan gaps, caught before they shipped):**
- **`CJAR_FLIP_RESOLVE` had to gain a `card` field — Delta 7's last loose end.** In the base game
  `CJAR_FLIP_START` already carries the card, so RESOLVE never needed it. Under Delta 7 Dibber
  Dobber's FLIP_START carries `card: null` (the window is blind) and the real card is not popped
  until resolve — so without it a client's hero card stayed **face-down through the entire
  reveal** and never learned what it was caught by. Applied client-side with an
  `undefined`-guard so the base game's behaviour is untouched. Confirmed by loopback: client card
  reads `null` during the window and the real type after resolve, hero flipping face-down →
  face-up.
- **A fourth `engine-multiplayer.js` insertion point the plan missed.** Every shipped game wires
  *two* settings switches: `mpSerialiseSettings` (~line 875) **and** the `SETTINGS_SYNC`
  deserialise case (~line 1065). The plan only listed the serialise half. Without the other,
  `SETTINGS_SYNC` arrives at clients and is silently discarded, so a client's read-only settings
  overlay shows its own defaults instead of the host's while the lobby is open. In-match rules
  would still agree because `CJAR_MATCH_START` carries all five — this is the pre-game view only,
  but the asymmetry would have been a Protocol A finding.
- **The audit's expected case count was off by one.** Step 8 predicts "eight `case` labels
  (2 ACTION + 6 SYNC)", but the plan's own Step 6 listing defines **seven** SYNC cases. 2 + 7 = 9,
  which is what ships. Same family as the `grep -c` line-vs-occurrence slips at Tasks 1, 2 and 11.

**Also fixed in Task 6 (plan defects, not runtime bugs):**
- The plan's `all real Mum lines` check was `sandbox.__cjar.data ? true : true` — vacuous, and
  the loop bridge had no `data` getter, so it passed unconditionally while reading as coverage.
  Getter added; the assertion now genuinely checks pool membership.
- The plan stubs `cjarResolveFlipDD` as a Task-8 forward reference but misses its twin
  `cjarAssignAffinities`, which `cjarStartRaid` calls in its Sylly branch. Any Sylly
  `cjarStartRaid` before Task 8 would be a `ReferenceError`. Both are now stubbed together.
- Task 6's implementations of `cjarStartRaid` / `cjarResolveFlip` / `cjarEndRaid` are appended
  **above** the Task-1 stub block, so the identically-named stubs would have hoisted last and
  silently shadowed all three. Removed. Worth a duplicate-definition grep after every task
  that promotes a stub.

---

## Multiplayer Lessons

**ML-01 — A two-device loopback found what four harnesses could not, in one run.** *(Task 15)*
Every cjar verifier runs in `'single'` mode, which is exactly what makes them able to drive all N
seats in one process — and exactly what blinds them to the packet contract. Standing up a second
vm as a **client** and piping the host's `mpSendEnvelope` straight into its `cjarHandleEnvelope`
cost about forty lines and immediately surfaced two defects that had passed 222 green checks:
**BUG-05** (the vacuous `cjarAllIn()` gate, visible as Dibber Dobber emitting *two*
`CJAR_FLIP_RESOLVE` packets where the base game emitted one) and the missing `card` field on
`CJAR_FLIP_RESOLVE`. It also positively confirmed things no single-process harness asserts: that
a client seated with deliberately **wrong** settings gets corrected by `CJAR_MATCH_START`, that
the private affinity channel actually delivers a distinct pair, that a stale `flipSeq` from a
second client is dropped, that host and client stashes agree after resolution, and that
`CJAR_PLAYER_LEFT` dissolves the match.
**Worth generalising to the next MDLM game.** It is not a substitute for the real three-device
session — it cannot see clock skew, Firebase ordering, dropped packets or anything visual — but
it is the cheapest way to prove the *shape* of the packet contract, and it catches the class of
bug where a payload field is simply absent. Consider it a standard fifth tool.

**ML-03 — A loopback without a WIRE is only half a loopback.** *(3 Aug 2026)*
ML-01's loopback found two real defects and was worth every one of its forty lines, but it
piped `mpSendEnvelope` straight into `cjarHandleEnvelope`. That passes **live JS references**
between the two devices, so it validates the packet *contract* — is the field present, does
the applier agree — while silently guaranteeing that the *transport* is lossless. Firebase is
not lossless: it erases `null`, `{}`, `[]` and any array left empty by them, and returns a
half-dense array as an object. BUG-06 lived entirely in that gap and survived the loopback,
222 harness checks and a code review.
**`tools/verify-cjar-loopback.js` is the replacement — the standard fifth tool, with two
things the ad-hoc version lacked:**

- **`fbWrite`/`fbRead`** between the devices, reproducing Firebase's erasure exactly. Its own
  behaviour is asserted first (11 checks) so the wire cannot quietly stop modelling anything.
- **A DOM of real mock elements.** The other three harnesses use `getElementById: () => null`,
  which is what lets them drive the rules headlessly — and which short-circuits every
  `if (!el) return` guard, so **no render code runs in any of them**. BUG-06 was a render
  throw. A harness that cannot execute a render cannot see a render bug, and cjar has ~350
  lines of it.

87 checks: both modes end to end, base game and Dibber Dobber, a 4-player and a 3-player
match, host↔client state agreement after every resolve, the blind window, the private
affinity channel, and `CJAR_PLAYER_LEFT`. It also takes `CJAR_SRC=` so a deliberately-broken
copy can be driven through the same wire — which is how the fix was proven to fail before it
was proven to pass. **Still not a substitute for the three-device session:** no clock skew,
no Firebase event ordering, no dropped packets, nothing visual, and one client is not two.
**Generalise it to the next MDLM game before its first playtest, not after.**

**ML-02 — `'single'`-mode no-op senders are what make the harnesses possible, and they are also a trap.**
`cjarSend()` early-returns in `'single'` and `'client'` mode, which is why the verifiers can call
`cjarStartMatch` and drive real appliers without a Firebase room. The sandbox turns
`mpSendEnvelope`/`mpSendPrivate` into functions that **throw**, so a broadcast leaking into
`'single'` mode fails loudly rather than passing silently — that pairing is the whole safety
mechanism and neither half works without the other. Task 15's three-green-harness run is
therefore a genuine proof that no sender leaked, not just that nothing crashed.

---

## Template Gaps

**TG-09 — the two-pill score row (`stashed` / `at risk`) is a candidate suite pattern, deliberately NOT elevated.** *(7 Aug 2026)*
DD-22's split of "safe amount" from "amount still in play" into two separately-styled pills reads
well and could suit any other push-your-luck or risk-pool game in the suite. **Not folded into
`ui-style.md`** — one game is not evidence for a suite rule, and elevating on a single instance
risks locking in a pattern nobody else has actually needed yet. Revisit if a second game wants a
safe-vs-at-risk (or similarly split) figure in one row; at that point compare the two real uses
and generalise from what's actually shared, not from what looked reusable in isolation.

**TG-08 — a state mutation with no on-screen beat reads as a layout problem, not a feedback problem.** *(7 Aug 2026)*
cjar's base game split a flipped cookie's value into `cjarRaidTotals` inside `cjarApplyCardEffect`
with no animation, no sound beyond the card's own, and no screen change — the only cookie feedback
the game had (`cjarFlyDelta`) fired exclusively on a **stash** change, which in the base game only
happens on Sneak Out. So the single most satisfying moment in a push-your-luck game — the payout —
had no beat at all: on a normal flip you gained cookies and nothing moved.
**Three playtest rounds reported this as "the action stage is off,"** and two full rounds of layout
work (DD-11's one-row stage, DD-12/DD-15's three-column grid) failed to fix it, because the
players' complaint was correctly diagnosed as *feel* but incorrectly attributed to *arrangement*.
Relabelling and repositioning a screen cannot fix a missing event.
**The generalisable check:** before redesigning a screen players call confusing, **list every
state mutation that screen performs and confirm each one has a visible beat** — an animation, a
sound, a number visibly changing, *something* — before touching layout at all. A screen that
"feels off" after two honest layout passes is a strong signal the problem was never the layout.

**TG-07 — A mock DOM whose `innerHTML` setter does nothing makes every count assertion vacuous.** *(3 Aug 2026)*
`verify-cjar-loopback.js`'s element mock declared `innerHTML: ''` as a plain property. Every
cjar renderer starts with `el.innerHTML = ''` before repainting, so on the mock that cleared
nothing and children **accumulated across renders**. The first run of the new assertions read
12 standings rows where 4 exist and 43 gallery tiles where 14 exist — both looked like real
bugs and were purely the mock. Worse, one *passing* check (`stageThumbs`) was passing by
coincidence, because a cumulative count happened to equal the correct one for the first two
flips.
**Fix:** a real accessor pair — `set innerHTML(v) { this._html = v; this.children = []; }`.
**Generalisable, and it cuts to the heart of why this harness exists.** The moment a harness
mocks the DOM richly enough to *execute* render code (which is the whole point — see ML-03),
it inherits the obligation to model the DOM semantics those renderers rely on. The three
`getElementById: () => null` harnesses have no such obligation precisely because they run no
render code. There is no middle ground where a half-modelled DOM is safe: it converts silent
no-ops into confidently wrong numbers, which is worse than not measuring at all. If a mock
grows a new property that game code *writes* to control structure — `innerHTML`, `textContent`
on a parent, `replaceChildren` — model it or assert nothing about it.

**TG-01 — The Stack check `grep -c "h-screen"` gives a false positive.** *(Task 2)*
`min-h-screen` contains `h-screen` as a substring, so a plain grep count rises by one per
correctly-built Stack screen. The plan predicted the count would be "unchanged" and it went
89 → 95. The real assertion is **bare** `h-screen` with a negative lookbehind:
`/(?<!min-)h-screen/g`. Worth folding into `phase-audit.md` Protocol A so future games do
not chase a phantom violation. Note also that `flex-1` and `flex-shrink-0` are *not*
violations on their own — `flex-1` on a horizontal strip and `flex-shrink-0` on an overlay
title block are both required patterns; the banned thing is specifically the
`h-screen` + `flex-1` Stage + `flex-shrink-0` Header/Controls **trio**.

**TG-04 — cjar is the first plugin to define UNPREFIXED function globals. RESOLVED 3 Aug 2026 — renamed.** *(Task 5)*
**Done:** `cookieCard` → `cjarCookieCard`, `familyCard` → `cjarFamilyCard`, `treatCard` →
`cjarTreatCard`, `seatsChoosing` → `cjarSeatsChoosing`. 77 occurrences across `js/games/cjar.js`
(18), the two harness bridges (8), the tech spec (14) and the build plan (37) — swept together
the way Delta 5 was, so no artifact still names the old symbols. All five tools green
afterwards. cjar now matches all 17 other plugins: zero unprefixed function globals.
Original entry:
The plan specifies four functions without the `[abbr]` prefix: `cookieCard`, `familyCard`,
`treatCard` (Task 4) and `seatsChoosing` (Task 5). `definitions.md` § Function Naming makes
`[abbr]*()` the rule for plugin functions, and a check across all 17 shipped plugins found
**zero** unprefixed function globals — the convention is universally held. Every symbol in
this app is a true global (no modules), so a later game defining its own `treatCard` would
silently override cjar's, or vice versa depending on load order; there is no error, just
wrong art or a wrong card.
**Status: no collision today** — grep confirms all four names are unique across `js/`.
Implemented as the plan specifies rather than renamed unilaterally, because the names appear
across Tasks 6–16 and the plan is the confirmed artifact.
**Recommendation:** rename to `cjarCookieCard` / `cjarFamilyCard` / `cjarTreatCard` /
`cjarSeatsChoosing` before Task 17, since Protocol A's drift check will flag it anyway and
the rename is cheaper now (4 names, ~20 sites, two harness bridges) than after the render and
MP layers reference them. Sweep the plan at the same time, the way Delta 5 was swept.

**TG-03 — The harness's identity `shuffle` stub hides all ordering bugs.** *(Task 4)*
`tools/verify-cjar-deck.js` stubs `shuffle: a => [...a]` so deck builds are deterministic —
which is what makes the composition assertions possible, and is the same trick
`verify-pko-chain.js` uses. The cost is that **`cjarFloatCookies` is only ever exercised
against a sorted deck** (all 15 family cards, then all 15 cookies), so its `findIndex` +
double-`splice` never meets an interleaved one. This is structurally the PKO **TG-07** class:
green checks that cannot see the bug by construction.
**Instance 1 — the deck builders (Task 4).** Re-ran `cjarBuildDeck` 20,000× per config against
a real Fisher–Yates copy of `engine.js:470` — 80,000 builds, all invariants held (15 cookies
always, 31 cards, slot 0 a cookie on `safe`, slots 0–1 on `warmup`, 11-card Sylly deck with
exactly one Treat), and all 12 distinct cookie values reached slot 0, so the float is not
biased to a fixed card.

**Instance 2 — the full-match test (Task 7).** `A full 3-Raid match banks a history row per
Raid` is **degenerate under the stub**: the base deck is built family-first, so with identity
shuffle every Raid busts on flip 2 (mum, mum) and the history is `[[0,0,0,0],[0,0,0,0],
[0,0,0,0]]`. Its `no negative bank` and row-shape assertions are satisfied by all-zeros — the
section proves the loop does not throw and nothing whatsoever about the economy. Covered ad
hoc by 4,000 real-shuffle matches (4–8 players, both match lengths, all three House Rules,
random sneak rates): no throws, 44,736 non-zero banks across 16,054 history rows, biggest
single-Raid bank 93, ranks and Red-Handed well-formed every time, and **no family copy ever
went negative** across a full match of repeated burns.

**Instance 3 — Dibber Dobber (Task 8).** The DD harness pins `Math.random` and never plays a
Raid end to end, so `cjarStartRaid`'s Sylly path — which now calls the real
`cjarAssignAffinities` rather than the Task-6 stub — was never exercised by it. Covered ad hoc
by 2,000 real-shuffle DD matches (4–8 players, both lengths, random actions per seat): 87,846
flips, **every one conserved exactly** against the DD-05 invariant, no negative Stash, debt
always within [0,6] with the cap reached but never exceeded, 7,522 Treats claimed, and
Favourite ≠ Watcher on every seat of every Raid.

**None of these runs is committed and none will re-run on its own.** If `cjarFloatCookies`, the
deck builders, `cjarResolveFlip` or the Raid/match lifecycle are touched, redo them — or fold
a real-shuffle section into the harness at that point. Not folded in now only because the plan
fixes the harness contract and later tasks append to the same file.

**TG-02 — Core art masters arrive at generation size, not card size.** *(Task 3, for Task 16)*
The 14 delivered PNGs are **1024×1024, 1.13–1.50 MB each, 19 MB total** — against a plan
ceiling of ≤40 KB per card, ≈600 KB total. That is a ~32× reduction, and unlike the
FLW/FRT/SHP runs (whose masters were already near card aspect and small) these need genuine
downscaling to the 360 px target, not just recompression. The expansion-guide gotcha
"check the masters' dimensions before setting the converter's target width" cuts both ways:
those three runs were warned against *upscaling*, this one needs a real downscale.
Also note the masters are **square**, not card-aspect.

---

**TG-06 — The warning strip has two states per mode, not the three its spec copy implies.** *(Task 11)*
`cjarRenderWarningStrip` reads as a three-rung ladder — dim / lit / danger — but
`cjarSeen[id]` is only ever `0` or `1`: the second sighting busts the Raid immediately, so
there is no "seen twice" to escalate to. In the **base game** seen-once *is* the danger
condition, so the amber `bg-[#F7E9C4]` rung is unreachable and only two states ever render.
The amber branch exists for **Sylly**, where `danger` is forced false because Dibber Dobber
has no bust. Found by reading back the rendered slot classes over 13 flips (dim + danger only,
never amber). Code is correct; the comment was not, and is now fixed in place. Flagged because
a Protocol A reviewer seeing "the amber state never appears" would reasonably file it as a bug.

**TG-02b — The 40 KB card ceiling is calibrated for a SMALL card; cjar's hero is 3.5× bigger.** *(Task 16)*
The suite's cards are tiny — PKO's is `4.25rem` (68 CSS px), so its 360 px art is **5.3×** the
render width and looks crisp anywhere. **cjar's hero is `15rem` (240 CSS px)**, and because the
masters are square (1024×1024) against a portrait card (ratio 0.728), `background-size: cover`
discards ~27% horizontally — leaving only **~1.1× effective** at 360 px.
**Widths were measured, not copied.** With the 40 KB cap held: 360 px → worst quality **q80**,
492 KB total. 480 px → the busiest cards (`mountain`, `treat1`) are forced to **q58** and show
JPEG blocking. 560 px and 640 px **breach the cap outright** even at q52. So the cap itself is
what limits resolution here, and 360 px is the only width that stays clean.
**Chose clean-and-soft over sharp-and-artefacted** — illustrated art upscales far more gracefully
than JPEG blocking degrades. Shipped: 18.7 MB → **492 KB**, a 39× reduction, all 14 files under
ceiling, against a ~560 KB budget.
**The lever if a sharper hero is ever wanted:** pre-crop the masters to the card aspect
(745×1024). That buys roughly **1.9× more VISIBLE pixels per byte**, because nothing is spent on
pixels `cover` throws away. It permanently discards 27% of the artwork, so it is an owner call,
not a converter default — deliberately not done here.
**Generalisable:** a per-file byte ceiling is only meaningful next to the element's *render* size.
Any future game with a large hero card should set its ceiling from the card dimensions at spec
time, not inherit the small-card 40 KB figure. And check master *aspect* against card aspect —
square masters silently waste a fixed fraction of every byte.

**TG-05 — Registering a core-art manifest before its images exist makes the emoji fallback unreachable.** *(Task 10 — RESOLVED at Task 16)*
**Closed 2 Aug 2026.** All 14 JPEGs now exist and every one of the 13 derived art keys plus the
back resolves to a real file, so the blank-bordered-box window between Tasks 10 and 16 is over.
The generalisable point stands for DYB and PASS: land the manifest and the images in the same
change. Original entry:
`assetFace(kind, id)` (`js/lib/art.js:72`) resolves purely from the **manifest** — it builds a
URL from the filename string and never checks that the file exists. So the moment
`data/art/cjar/pack.json` is registered, `cjarRenderCard` takes the asset branch for every
card, sets `background-image` to a URL that 404s, and `.cjar-card-asset .cjar-card-emoji {
display:none }` hides the fallback that would otherwise have drawn something.
**Consequence:** from Task 10 until Task 16 lands the JPEGs, every cjar card renders as an
**empty bordered box** in a browser. This is the plan's intended sequencing ("images land in
Task 16"), not a bug — but Tasks 11–15 build the table UI, so anyone eyeballing a screen in
that window will see blank cards and should not go hunting for a render bug.
**If a visual check is needed before Task 16**, either pull the conversion forward or
temporarily remove `"cjar"` from `data/art/registry.json` to fall back to emoji. Do not
"fix" it in `cjarRenderCard` — the seam is correct; the images are simply absent.
**Generalisable:** for the remaining core-art conversions (DYB, PASS), land the manifest and
the images in the same change. The FLW/FRT/SHP runs did, which is why this never surfaced before.

---

## Art file mapping (for Task 16)

Delivered masters live in `data/cjar/` and are named for their subject, not for their
manifest key. The conversion step must rename as it converts:

| Master | Manifest key | Output |
|---|---|---|
| `handful.png` | `cookie-handful` | `data/art/cjar/img/cookie-handful.jpg` |
| `batch.png` | `cookie-batch` | `cookie-batch.jpg` |
| `mountain.png` | `cookie-mountain` | `cookie-mountain.jpg` |
| `mum.png` | `family-mum` | `family-mum.jpg` |
| `dad.png` | `family-dad` | `family-dad.jpg` |
| `bigsib.png` | `family-big` | `family-big.jpg` |
| `grandma.png` | `family-grandma` | `family-grandma.jpg` |
| `fampet.png` | `family-pet` | `family-pet.jpg` |
| `treat1.png` | `treat-shortbread` | `treat-shortbread.jpg` |
| `treat2.png` | `treat-redvelvet` | `treat-redvelvet.jpg` |
| `treat3.png` | `treat-macadamia` | `treat-macadamia.jpg` |
| `treat4.png` | `treat-macarons` | `treat-macarons.jpg` |
| `treat5.png` | `treat-brownies` | `treat-brownies.jpg` |
| `cardback.png` | `assets.back` | `back.jpg` |

**Treat mapping CONFIRMED by the owner, 2 Aug 2026.** `treat1`–`treat5` are in **reveal
order**, which is exactly `treatSchedule["5"]`: strawberry shortbread → red velvet → white
chocolate macadamia → macarons → brownies. The numbering is not arbitrary — it encodes the
schedule, so `treat5` (brownies) is deliberately the one that lands on the **final** Raid at
either match length (it is `treatSchedule["3"][2]` as well as `["5"][4]`). That also means the
positional names line up with the point tiers by construction: 1–3 are the 5-point specials,
4–5 the 10-point supers. No inspection needed.
