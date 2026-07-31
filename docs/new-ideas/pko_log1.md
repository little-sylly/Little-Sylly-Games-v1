I've read the brief, the ruleset doc, and the art checklist, and checked the code realities behind the claims. This is a strong, unusually thorough brief — the vocabulary, the Trail examples, and the worked samples do a lot of the tech-spec's job already. Below is what I'd want resolved before Stage 2.

🔴 Blockers — rules holes a tech spec can't paper over

How do you beat a Mark slot that holds more than one card? This is the biggest hole. From §3 + §14, a Stake of 🐝🐝 creates two single-card Marks, so slots only ever hold multiple cards via a Swarm. But then: a slot holds 🦦🦦 (Mongoose Swarm). Does one Leopard beat it, or do you need two? The brief never says, and every sample avoids it by only Swarming Eagle (which has no predator, so both readings agree).

Both are defensible, and they're very different games:

Species-only adjacency — one Leopard beats any depth of Mongoose. Simple, and makes Swarming risky (you spend 2 cards, a single predator wipes them).

Depth parity — need Leopard ×2. Swarms become genuinely defensive, but the board can spiral.

Related: §8 defines Mob as "multi-card answer to one Mark", but no rule anywhere ever requires or permits a multi-card non-Swarm answer. Right now Mob is a term with no mechanic. Either define it or cut it.

Poacher-as-wild directly contradicts itself across docs.

§3: opening Stake may be "supplemented by Poacher/Mimic wilds"

§12: "Poachers no longer count toward species copy count… cannot be used to satisfy a Stampede or Swarm threshold"

§15 Stampede button: "player holds enough copies (+1) including Poachers/Mimics" ← contradicts §12 in the same document

pecking-order-ruleset.md: "Human can stand in as a wild copy inside a swarm (2 Elephants + 1 Human plays as three)" ← contradicts §12

And the unanswered follow-on: if a Poacher is Staked as a wild Fish, is that Mark a Fish (beatable by Octopus) or a Poacher (unbeatable)? Whichever way, this needs one sentence that all four places agree with.

Mimic is spec'd only for Mobs, but Mobs don't exist. "Acts as a wild copy of any species — can extend a same-species Mob or count toward a Stampede threshold." Given #1, "extend a Mob" presumably means "count as a copy in a Swarm". Also unresolved: Mimic can count toward Stampede but Poacher can't — is that deliberate asymmetry? It reads like an accident.

First-Leader rule contradicts its own sample. §12: "Clash winner opens next Clash; first Clash opens with a random player." §14: Ava wins Clash 1, then "Cal holds 1 Bee + 1 Stingray — opens Clash 2" — that's the dropped Giant-Killer rule from the ruleset doc leaking into the sample.

Carrion can un-win a Clash. Carrion fires "after a successful Challenge". If that Challenge emptied my Hoard and I then keep beaten Marks, I no longer have an empty Hoard. Need an explicit ordering: win-check before Carrion, or Carrion unavailable on a hand-emptying Challenge.

Deluge / Dry Season skip can loop. "If no players have valid cards, the Encounter is skipped, a new event fires." If the new event is also Deluge (or Dry Season with a Sea-heavy table), it skips again. Needs a guard — exclude the just-failed event from the redraw, and cap consecutive skips.

Gesture collision: tap-hold is bound to two things. §16: "tap-hold any card → chain diagram." §15 Method C: "tap-hold-drag a card from the Hoard." Same opening gesture, and both live on the Hoard fan. Also §15 says single-tap expands the card to full-face, while Method B says single-tap auto-assigns it. Three gestures, two of them double-booked.

🟠 Contradictions & drift

Where

Issue

§6 vs §7

Hoard Size default is 15, but Invasive Mimicry says "+5 after their initial deal (default Hoard = 20)". Is FoN's base deal 15 (→20) or is 20 the FoN default?

§7 vs §11/§12/§14

Event is named Invasive Mimicry in §7, Invasive Species in §11, §12 and §14. Pick one.

§9

The brief never states the actual chain — beaten_by for all 13 animals lives only in pecking-order-ruleset.md. It must be transcribed into the brief/spec as the single source of truth, including the four non-obvious bits: Eagle has no predator; Eagle and Leopard are siblings (neither beats the other); Orca↔Stingray is a closed pair; Mongoose and Eagle are the only cross-track reach (both → Fish).

§9 schema

Carrying both beats and beaten_by guarantees they'll desync. Store beaten_by only; derive beats at load.

§6

Poacher pill label 1n is engineer-speak on a user-facing pill. Suggest None / 3 / One each.

§18

"Abandon Territory?" is the quit vocabulary (§8) being used as an end-of-match button label, with a question mark on a button. Post-game ✕ should route to resetToLobby() per the house rule; play-again ("Enter the Wild") needs the mandatory decision-modal confirm.

🟡 Pushbacks

A. Sound design (§19) is largely unbuildable as written. The suite is Web Audio synthesis only — no audio files, ever (hard constraint in CLAUDE.md). "Short triumphant animal call", "night insects emerge", "apex predator roar", "herd thunder" are sample-based sounds. I can synthesise credible versions of maybe 8 of your 20 moments (rumbles, thuds, stings, whooshes, denied buzz, metallic ring). The rest either become abstract tones or get cut. Worth deciding now which moments actually matter.

B. Dark Forest is the most expensive event in the brief for the smallest actual effect. It requires: Marks routed off the public channel onto mpSendPrivate for two specific uids, an existence-only public signal, hidden Mark counts, and permanently per-player-redacted Trail views — a whole second state-distribution path used by one event. But every player sees the full Marks the moment it's their turn anyway, so it only hides information between your turns, and only for a few seconds. My recommendation: cut it from v1 or replace it with something cheaper (e.g. "Marks are hidden until you tap to peek, once per turn"). Also worth knowing: the host device holds all state regardless, so a host with dev tools sees through Dark Forest — the privacy is UI-level for one of the players no matter what we build.

C. Extinction Event awards a point for being wiped out. The Culling explicitly can't win a Clash; Extinction explicitly can, for multiple players at once, and it can hand the Match to someone who played no cards that Clash. That's a coin-flip point in a game whose whole pitch is "knowing the food chain is the skill." Suggest Extinction ends the Clash with no points, or awards the point only to the player who was already closest to empty.

D. Scope. This is comfortably the largest game in the suite. For reference, the biggest plugin today is nt.js at 149 KB and the median is ~70 KB. Pecking Order as briefed is: 14 screens, a bespoke drag-capable Challenge builder with 3 input methods, 10 rule-mutating events (several of which rewrite the beat graph, redistribute all hands, or wipe species mid-Clash), a private-channel MDLM layer, a new data file, ~53 illustrated assets, and a per-skin reskin system. I'd strongly recommend shipping the core climbing loop first and playtesting it before a single FoN event is built — the base game's balance (see E, F) is unproven, and every event is a multiplier on an unvalidated foundation.

E. Eagle may be degenerate. Eagle has no predator and 3n copies. An Eagle in any Mark set can only be answered by an Eagle Swarm or a Poacher (3 in the whole 151-card pool at n=4). The obvious dominant line is "always include one Eagle in your Stake." Intended as a "dead-end branch", but at 3n copies it may just be the best card in the game. Worth a hard look at the copy count.

F. Mouse and Fish beat nothing. They're 4n each — ~21% of the pool — and can only leave your Hoard as a Stake or a Swarm. A player who never goes Unchallenged can never shed them. In a shedding game that's the interesting tension, but it may also be a stall. Flagging for playtest, not for redesign.

G. Force of Nature's per-Encounter all-players-confirm gate. With ~5 Encounters a Clash and 6 players, that's a full-screen modal + 6 confirms before every trick. Suggest a 2-second auto-advancing banner with the event label persisting on the play screen (which §7 already specifies), and drop the confirm.

H. Four warm-yellow games. JEC amber-500, BLD yellow-500, FRT banana #FFC700, and now PKO yellow-800. yellow-800 is dark enough to read as brown, so it probably survives, but the lobby tile row is getting crowded at that end of the spectrum.

🟢 Suggestions & notes

Use the existing cartridge seam, not a parallel skin param. The suite already has assetFace(kind, id) / assetBack(kind) in secret-mode.js:83, device-local and ids-only — which is exactly the mixed-skin multiplayer §9A describes, already built and shipped. pkoRenderCard(id, opts) should call assetFace('pko', id) internally. One caveat: asset packs currently carry images only, so Aussie Fauna renaming Fish → Barramundi needs a new names field on the pack manifest — a small, clean addition.

Build with emoji faces first, drop the art in later. §9A says "no emoji fallback at launch", which is fine as a shipping statement, but the seam should still render emoji when art is absent so implementation isn't blocked on 53 NanoBanana generations. The art then lands as a drop-in with a SW bump. This costs nothing and de-risks the schedule considerably.

~53 illustrated assets in PRECACHE_URLS is a first for this project. Worth setting a per-card byte budget (WebP, ~30–40 KB each → ~2 MB install) before generation starts, not after.

Alpha's card-ordering rule (§12) is good and load-bearing — challenger's card immediately left of the survived Alpha. Keep that; it's the kind of detail that's painful to retrofit.

The Great Reversal "intended, not a bug" note is genuinely useful and I'll honour it.

Your pool totals check out — I verified n=3 (114) and n=4 (151) against the copy formulas.

pko is free as an abbreviation; no collision with the 16 existing prefixes.

Update Todos

Amend brief to v6 — §3 core loop (Swarm cut, Stampede sole same-species mechanic)

Amend §8 vocabulary — remove Swarm/Mob rows, rewrite Stampede row

Amend §9 — transcribe full predator chain, drop `beats` field, Eagle copy count

Amend §12 — Poacher solo-only, first-Leader random, drop Swarm flags

Rewrite §14 sample Encounters without Swarms; fix Clash 2 opener

Amend §15 — delete stacking subsection and Method C

Amend §17 How to Play steps 3–4; mark §7 Force of Nature as Phase 2

Verify brief v6 — grep Swarm/Mob/Invasive Species, replay samples, check emoji integrity

Run Protocol C (Studio Sweep) from phase-audit.md

Write Stage 2 technical spec docs/new-game-tech-pecking-order.md

Done. Three deliverables:

Brief amended to v6 — new-game-brief-pko.md

The six decisions are applied throughout, plus the knock-on effects:

§3 now opens with the invariant — one card per Mark slot, always — followed by Stampede as the sole same-species mechanic, a worked example, and the Poacher/Eagle rules

§9 now carries the full beaten_by chain, which previously existed only in the concepts-only ruleset doc. The four non-obvious facts (Eagle's dead end, Eagle/Leopard siblings, Orca↔Stingray closed pair, Mongoose/Eagle as the only cross-track reach) are called out as "do not tidy"

Eagle 3n → 2n, pool totals recomputed — 111/147/183/219, all four verified against the copy formulas, ~41% dealt ratio preserved

§14 samples rewritten and hand-replayed against the chain table — every play is legal. Encounter 1 now demonstrates the Eagle wall and the rejoin-after-Retreat rule; Encounter 2 demonstrates a Stampede growing the board 2→3

§7 Force of Nature carries a Phase 2 banner listing its six unresolved issues; §19 carries the synthesis-only constraint with a per-moment buildable column

Verification: Swarm/Mob/Invasive Species return zero live hits (only the two deliberate "this was cut" notes), and 55 multi-byte emoji including the ZWJ sequence 🐻‍❄️ survived intact — no mojibake.

Protocol C run. Part 2's greps came back clean. Part 1 found three lessons flagged "candidate for elevation" that were never actioned, and all three land on PKO — so I elevated them: accumulator-array reset-in-payload and single-source card arithmetic → logic-engine.md; transient animations must float, not sit in the flow → ui-style.md.

Stage 2 tech spec — new-game-tech-pecking-order.md. 7 new screens, 7 overlays, full MP packet table with the missing-handler audit, pkoBeats() as the single legality predicate, assetFace('pko', id) reusing the shipped skin system. Eight deviations logged in §17.

Two things worth your attention:

I hit a new blocking rules hole while replaying the samples: what is a Poacher once it's on the board? It wins its Mark and then becomes one — with an empty beaten_by, making it unbeatable except by another Poacher. That usually ends the Encounter on the spot. It's §16 Q1, and §7's validation rules can't be finalised without it. My default is (a) — it stays unbeatable, which is thematic and at ~1 Poacher in play per Clash reads as a once-a-game moment rather than a dominant strategy.

Second: with Force of Nature deferred, the Sylly Mode toggle would do nothing in v1. I'd omit the card and keep the variable, but that breaks the "every game has a Sylly Mode card" standard, so it's your call (§16 Q7).

Next: answer §16 Q1 (blocking) and Q2–Q7, and confirm the §17 deviations. Per new-game-process.md the Stage 2 gate holds implementation until you sign off — no game code yet. Once confirmed, Stage 3 opens with Protocol B Steps 1–4 (skeleton, routing, exit routing) before any game logic.

before we continue, since the game isnt a clone of anything (even though its close to a game i played without the full ruleset), just through what you know now what do you think of the overall balance? is it playable and adjust or do you think we are far from a balanced game

Good question to ask before locking the spec. I ran the numbers from the finalised v6 rules rather than eyeballing it.

Verdict

Structurally sound, genuinely playable, but not yet balanced. Nothing here needs redesigning — the problems are all single-parameter dials. Two things are better than I expected, one is worse, and one is a straight arithmetic error in the brief.

What's stronger than I thought

Shedding is symmetric. I initially assumed winner-leads-next would snowball hard. It doesn't, because a Challenge sheds exactly as many cards as the Stake did — board width w means every player who acts sheds w. The Leader's advantage is only selection (which species leaves your hand) and width control, not throughput. That's a much milder edge than Big Two's lead. I'd keep winner-leads-next, contrary to the flag in your old ruleset doc.

The dead-weight maths is accidentally well-tuned. Mouse + Fish are 21.8% of the pool and beat nothing — they can only leave via a Stake. At n=4 that's ~3.3 dead cards per 15-card hand, and you'll lead roughly twice in a Clash. Two Stakes dumps almost exactly your dead weight. It's tight but it works, and it makes "you must win Encounters to win the Clash" a real, coherent constraint rather than a stall.

What's worse

Eagle is the single most decisive card in the game, by a distance. At n=4 (pool 147, 60 dealt):



Copies

In play

Per hand

P(hand holds ≥1)

Eagle

8

3.3

0.82

57%

Poacher

3

1.2

0.31

27%

An Eagle anywhere in a mixed Challenge makes the whole board answerable only by a player who holds a Poacher and valid predators for every other Mark simultaneously. That's demanding enough that an Eagle in a Challenge is close to a guaranteed Unchallenged — and going Unchallenged is what lets you dump your Mice next turn. With ~3.3 Eagles in play against roughly 8–10 Encounters per Clash, Eagles plausibly decide 30–40% of Encounters.

2n was the right call and it isn't enough. I'd take Eagle to 1.5n (rounded: 5/6/8/9) and watch it. The skill expression — "can I answer this board?" — lives in the midgame; the decisive moments are premium-card draws. That's within genre norms (Big Two's 2s, Dou Dizhu's bombs), but Eagle is currently a stronger 2 than Big Two's 2.

The arithmetic error

Brief §4 says 15–25 minutes for the whole Match. I make it 35–50.

Cards shed per Encounter ≈ board width × (1 + challenges) ≈ 5 at typical widths. Sixty cards in play, Clash ends when the first player empties → ~9–12 Encounters per Clash. Each Encounter is 4–8 sequential turns on separate phones, and a Challenge is a multi-tap build, so ~60–100s per Encounter. That's 12–16 min per Clash, and the default target is 3.

Worse, the settings can compound: Hoard 20 + 7 Clashes is a 2-hour game. That's well outside the suite's range.

Two smaller flags

Scavenge on Retreat is mechanically a penalty wearing a reward's name. In a race-to-empty, drawing a card sets you back. It's a real, interesting tension — retreat safely but pay for it — but players will read "Scavenge" as a bonus and be surprised. Worth either renaming or making the description explicit.

n=3 will play very differently from n=6. Only two opponents need to Retreat for Unchallenged, so Encounters resolve far faster and Stakes dominate. The ~40% dealt ratio holds card variety constant across table sizes but does nothing for pacing. Your brief already says 3 works but 4+ is richer — I agree, and I'd add that 6 will feel slow.

Where that leaves us

Playable now, and I'd be comfortable building it. But I'd rather set two dials before we lock the spec than discover them in playtest, because both change data/pko-data.json and the settings table — cheap now, annoying after implementation.

Both accepted. Let me recompute the pool from scratch with Eagle 1.5n, Poacher 1n, and Hoard 12.

New pool totals (Eagle rounds up: 5/6/8/9):

n

Pool

Dealt (12×n)

Reserve

3

110

36 (32.7%)

74

4

146

48 (32.9%)

98

5

183

60 (32.8%)

123

6

219

72 (32.9%)

147

The dealt-to-Pool ratio stays constant across table sizes (32.7–32.9%) — that constancy was the actual design intent in your ruleset doc, and it survives. But the level drops from ~40% to ~33%, so more of the Pool sits in the Reserve and each Clash is a bit swingier. Worth knowing; not a problem.

What the two changes actually did, at n=4:



Before

After

Eagles in play per Clash

3.3

2.0

Poachers in play per Clash

1.2

1.3

P(hand holds an Eagle)

57%

40%

Counter-to-Eagle ratio

0.36

0.67

The Eagle:Poacher ratio nearly doubles in the counter's favour, which is the real fix — Eagles now decide roughly 2 of ~8 Encounters instead of 3–4 of ~9, and about two-thirds of those have a Poacher available somewhere at the table.

One thing to flag: "one each" barely moves the needle at n=4 (3 → 4 Poachers). It does real work at n=5 (3 → 5) and n=6 (3 → 6), which is where the extra Eagles also live. So the two changes scale together correctly.

Length: ~25–35 min for a 3-Clash Match at n=4 (~8 Encounters/Clash × 60–100s). That's the middle you asked for, but it's still above the brief's stated 15–25, so I'll correct §4 rather than leave the doc lying.

I also want to drop Hoard Size 20 — with target 7 still available it preserves the 2-hour path we just set out to remove. Proposing options 10 / 12 / 15, default 12. Pushing back on that is fine; it's the one change you didn't explicitly ask for.

Structural re-check on the new numbers: Mouse-killers (Mongoose + Eagle = 5.9 in play) still slightly outnumber Mice (5.3), so Mice Stakes stay answerable; dead weight holds at 21.7% of hand, and you still lead ~2× per Clash to shed it. The tuning survives the change.

Update Todos

Brief v7 — §3 Eagle 1.5n, §4 length 25–35 min

Brief v7 — §6 settings (Hoard 10/12/15 default 12, Poacher One Each, Scavenge note)

Brief v7 — §9 copy formulas + pool totals; §12 pacing note; §7 Phase 2 numbers

Spec — §5 settings, §10 chain + pool totals

Spec — §16 resolve Q2/Q3, §17 deviation row, new §18 Balance Model

Verify — arithmetic, stale-value greps, emoji integrity, settings coherence

All four verification steps pass:

Arithmetic — independently recomputed from the formulas; exact match on all four rows
Stale values — one real hit found and fixed (§15 checklist still had 111/147). Every other match is a deliberate historical reference ("up from a flat 3", "the original 15–25 estimate") or n=6's Reserve of 147, which legitimately collides with the old n=4 pool
Emoji integrity — 92 multi-byte matches including the ZWJ sequence 🐻‍❄️, no mojibake
Settings coherence — brief §6 and spec §5 match field-for-field across all five settings
Done
Brief → v7 (new-game-brief-pko.md) — Eagle 1.5n with the reasoning in §3, Poacher n, Hoard 10/12/15 default 12, pool totals and the dealt-ratio note in §9, plus a before/after table so the change is auditable. §4's length is corrected to 25–35 min, §14's sample setup updated to the new pool, and §12 gains four playtest watch items. The §7 Phase 2 banner's Hoard contradiction now reads 12+5=17.

Spec updated (new-game-tech-pecking-order.md) — §5 settings, §4 defaults, §10 chain and pool table, plus a new §18 Balance Model recording the density figures and, more usefully, the three structural properties any future tuning must not break:

Shedding is symmetric between Leader and responders — this is why winner-leads-next is kept, and the tripwire if that ever changes
Mouse-killers must outnumber Mice (5.9 vs 5.3) or a Mouse Stake becomes a free Unchallenged
Dead weight must stay sheddable — ~22% of a hand, ~2 leads per Clash to clear it
Two things I'd flag rather than bury:

Q2 and Q3 are now struck from §16, so the blocking list is honest: §16 Q1 (Poacher-as-Mark) is the only blocker left, plus Q4–Q7.

Dropping Hoard Size 20 is logged as deviation D9 — it's the one change in this pass you didn't explicitly ask for. It follows from the length decision (20 + 7 Clashes was the ~2-hour path), but say the word and I'll put it back.

Next: answer §16 Q1 and Q4–Q7 and confirm the nine §17 deviations, and the Stage 2 gate opens. Then Stage 3 begins with Protocol B Steps 1–4 — skeleton, routing, exit routing — before any game logic. The balance model in §18 is what your first playtest should be measured against; expect at least one of those numbers to be wrong.