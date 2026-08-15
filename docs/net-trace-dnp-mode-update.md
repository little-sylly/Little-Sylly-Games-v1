3p seems to be fine so lets move on for now.
What i want now is to focus on the the sylly mode. theres quite a number of minor issues. not suere where to begin

the legs preview are not a mess

the allocation system needs a fix, should be more simple, if i take resources off P1 then P2 (of the same team) should get the resources. but i suppose that only works for 2v2. we need a new system, right now its too many clicks. im not even sure its worth keeping the allocation system. but then we wont have anything to make this special apart from team based.

the tracing simulation doesnt have a smooth transition between the two legs. when the screen (within the terminal) shifts legs you can see the screen slide off to the right of the terminal. 

the diagnostic summary for this mode should definitely show cycle leader in terms of teams and the scoreboard in terms of teams (however do highlight each player's contributions)

at the moment, im reluctant to cut the allocation since we did spend time creating it, but without a simple and intuitive system it just adds friction. please review and let me know what you think, if we do cut it what 'gimmick' can we replace it with? 


Read the code. Here's my diagnosis on all four, then my honest view on the keep/cut question.

What I found

Leg previews. On screen-nt-allocation the non-selected legs render at cell 4 → 44×44px canvases (nt.js:809, nt.js:835), with structural gridlines drawn on top. At that size a maze is a grey smudge — you can't read a corridor, let alone judge which leg needs help. Meanwhile ntBuildBridgeInto / ntOpenBridgePreview (nt.js:2129-2160) — the chained edge-to-edge snake bridge with seam walls, built in BUG-10 — are dead code. Defined, never called. The good visualisation exists and got orphaned when the map-hero redesign landed.

Allocation clicks. The cost isn't the steppers, it's that it's a bank-mediated transfer with a selection step. Moving 2 FW from P1 to P2 = tap P1's lane → − → − → tap P2's lane → + → +. Six interactions for one idea, and you can never see both legs' numbers at once because the control hub is single-target by design (nt.js:860). The scale-invariance that motivated the morphing hub is exactly what costs you the taps.

There's a deeper problem underneath it: higher latency is better (you're defending — sers = latencies.map(lat => lat / clusterCeiling * 100), highest wins). So the real question a captain is asking is "which leg converts a firewall into the most delay?" — and nothing on screen answers that. No projected latency, no feedback after a change. The decision is real but blind, which is why it feels like busywork rather than strategy.

Journey slide. Confirmed bug. ntJourneySlide() sets translateX(16%) on the canvas (nt.js:2574), but its parent (index.html:7480) is p-2 rounded-xl border with no overflow-hidden — so the canvas slides visibly outside the terminal frame. Straight CSS fix (clip wrapper around the canvas). While in there: the journey runs left→right, so the incoming leg should enter from the right — currently the canvas jumps right then slides back left, which reads backwards.

Team summary. You're right, and it's worse than you thought. ntTeamCycleSERs is computed (nt.js:2724), stored, broadcast in NT_PLAYBACK, and applied on every client (nt.js:2943) — then never read by any render function. The entire team-scoring layer is calculated, synced, and thrown away. ntRenderSummary shows a flat per-player leaderboard in both modes. There's also no rolling team average across cycles (only per-cycle), so a match summary needs that added. Cheapest high-value fix of the four, and independent of the allocation decision.

On cutting allocation

I'd reshape it, not cut it — but not for sunk-cost reasons, and I'd cut it before I'd ship the current version.

What you'd actually lose by cutting: the captain role and the pre-build huddle. DNP without those is "2v2 with a shared scoreboard". What you'd keep regardless — both teams hardening the identical node per leg position, so you're duelling your opposite number directly; and Cluster Ceiling making one weak leg drag the team — is more of a gimmick than you're giving it credit for. That's already distinct from Standard.

But the current allocation isn't earning its friction, and the fix isn't fewer taps on the same model. My pick: the captain picks one Priority Leg — one tap. Base inventory becomes untouchable; the team gets a small surplus (+2 FW / +1 HP, say) that goes entirely to the chosen leg. The decision becomes legible ("where do we double down?"), it's discussable at the table, it scales identically at 2v2 and 4v4, and it kills the "take from P1 to give P2" confusion because you never take from anyone.

Architecturally it's cheap: ntAllPlayerAllocations, NT_ALLOCATION_LOCK, NT_ALLOCATION_UPDATE, the huddle timer and the 119-check loopback all survive — the pool computation changes and the stepper hub is replaced by lane selection you already have (ntSelectAllocLeg). And it makes fixing the leg preview worth doing, because picking a leg is now the whole decision.

If you'd rather cut cleanly, the best one-tap replacements I'd consider: a Sabotage pick (captain nominates one opposing leg to take an extra native honeypot — competitive, dramatic, reuses node-gen), or Weak Link scoring (team SER set by your worst leg, zero UI, pure "nobody slacks" pressure).


Grounded now — and I found something that changes the design detail.

📝 Confluence Snapshot — DNP Allocation → Priority Leg

Decision. Replace DNP's free-rebalance allocation hub with a Priority Leg model: every leg keeps its base inventory untouchably, and the captain's entire decision is one tap choosing which single leg receives the team's surplus. Batched with the team summary, journey slide, and leg preview fixes as one unit of work.

Rationale. The rebalance model's friction is structural, not cosmetic — bank-mediated transfer plus a single-target control hub means six interactions to express one idea, and the captain has no latency feedback to judge the trade with, so the strategy is blind. Priority Leg keeps what makes DNP feel like a team game (captain role, huddle, pre-build negotiation) while reducing the interaction to one tap and making the decision legible enough to argue about at the table. Critically, it's derivation-only: ntAllocations keeps its exact array shape, so no packet changes and the 119-check loopback stays valid.

Technical impact.

js/games/nt.js — new ntPriorityLeg state; ntAllocationPool becomes a fixed surplus (not ntInventory × teamSize); ntAdjustAllocation + ntRenderAllocControlHub retired in favour of ntSetPriorityLeg(legIdx) recomputing ntAllocations from base+surplus. ntRenderSummary gains an ntIsDNP() branch (team Cycle Leader + team scoreboard with per-member contributions) plus a rolling team average derived from ntTeamCycleSERs. ntJourneySlide direction reversed. Stale comment on ntOverallSER (nt.js:96 — says "per team (DNP)", it is per-player in both modes) corrected.

Leg preview — revive the dead ntBuildBridgeInto / ntOpenBridgePreview (nt.js:2129) as the lane display, replacing the 44px thumbnails. This merges two items: the chained edge-to-edge bridge is the picker, so tapping a leg in the chain sets priority.

index.html — overflow-hidden clip wrapper around #nt-playback-canvas (index.html:7486); allocation screen markup trimmed where the control hub was. Single targeted edits, not a sweep — per the encoding warning I'll verify no mojibake after.

sw.js — CACHE_NAME → v191.

Verification — node tools/verify-nt-loopback.js must stay green across seeds; visual-check for the preview and slide, since both are presentational and no harness reaches layout.

One thing I need your call on. Checking the numbers surfaced a latent bug in the current system: ntAdjustAllocation bounds only against the team pool (nt.js:905-906), never against NT_ALLOC_HONEYPOT_CAP = 2 per node. At 2v2 with base honeypot 2, a captain can already stack all 4 of the team's honeypots onto one leg — a node that can only hold 2 allocated (and caps at 4 total including natives). Priority Leg needs the same clamp, so I'll fix it either way.

Given honeypot inventory rolls 0–2 and firewall rolls ~5–24 on an 18-grid, I'd size the surplus at +2 firewall / +1 honeypot, honeypot clamped to the node's remaining capacity — a meaningful but not decisive boost. Say the word if you'd rather it be firewall-only (simpler, no clamp needed) or a bigger swing.

Waiting on your confirmation before I write code.

Just completed: design review of all four DNP issues, root-caused each in code (including the never-rendered team SER layer and the honeypot cap gap), and locked direction on the allocation reshape.

Next: implement the Priority Leg model plus the three fixes as one batch, then a single documentation-closure pass — Opus, high effort, same session (the nt.js slices I'd be editing are already loaded; a fresh session would re-read the same three regions).


i like your idea, however lets adjust it slightly. lets make it so the allocation team pool can be split. im thinking the system is select type of resource firewall (default selected) and honeypots, then select player then click to add - im thinking maybe just a simple click to add system with an option to reset - that way you just make clicks on the players to add (no need for messy up/down +/- buttons). 

we scale the resources at 1 honeypot for player (on a team) and 3 firewalls per player = 3p means 9 firewall and 3 honeypot surplus.
What do you think? 

Yes — that's better than my version, and for a reason worth naming: the brush-and-tap model removes the mode split. In my Priority Leg the leg tap meant "select", in yours it means "deposit". One less concept, and it scales past one leg without adding taps. The per-player scaling (3 FW / 1 HP) is also the right instinct — it keeps the per-leg average constant at any team size, so 2v2 and 4v4 feel identical rather than 4v4 feeling starved.

Two adjustments I'd make.

Reset alone is too blunt — add Undo. At 3v3 the pool is 9 FW + 3 HP, so a misclick on deposit 11 costs you all 12 taps. Keep a deposit stack and give the captain Undo (pops the last one) next to Reset All (clears to zero). Both discoverable, no hidden gestures, and Undo is ~4 lines given you're already tracking deposits per leg. I'd also bind long-press-a-leg to remove one unit from it — bindCardHold is an existing engine.js global and NT's long-press is currently idle, so it's a one-line wrapper — but as a bonus, not the primary affordance.

The honeypot cap will bite constantly unless we lift it for DNP. This is the one thing in your numbers that doesn't survive contact with the constants. NT_ALLOC_HONEYPOT_CAP = 2 (nt.js:71), and base honeypot already rolls 0–2. So a leg whose base rolled 2 can accept zero honeypot surplus, and at 3v3 you're handing the captain 3 honeypots that may have almost nowhere legal to go. That reads as broken, not strategic.

My fix: in DNP, the per-leg honeypot ceiling becomes NT_HONEYPOT_CAP − node.nativeHoneypots.length — i.e. up to 4 when natives are 0, which is the shipped default setting. That uses the existing total-cap constant as intended rather than inventing a number, and it's justified: NT_ALLOC_HONEYPOT_CAP was sizing a per-cycle random roll, not a deliberate team investment. Each leg then shows its live ceiling (FW 14 · HP 1/4) so a refused tap is predictable rather than surprising, and a full leg bounces with playBoing() + the existing storage_insufficient routing message the build screen already uses.

One consequence worth knowing before you commit, because it's emergent rather than designed: the hardening window is fixed per player (45/60/90/120s). Dumping all 9 firewalls on one leg at 3v3 gives that player ~23 blocks to place in the same time everyone else places ~14 — they may physically run out of clock and waste the surplus. I think that's good (concentration carries a real cost, and it forces the captain to talk to the player rather than decide at them), but it does mean the receiving player didn't consent to the workload. Flagging it rather than pre-solving it — worth watching in the first live session.

Everything else from the snapshot holds unchanged: base inventory stays untouchable so the model is purely additive, ntAllocations keeps its array shape, packets don't change and the 119-check loopback stays valid. Unspent surplus keeps the existing flash-warning-but-commit behaviour (D14).

So the build is:

Allocation — two brush pills (Firewall default / Honeypot, standard .pill / pill-active-emerald), tap-a-leg-to-deposit, Undo + Reset All, live per-leg FW n · HP n/max, DNP honeypot ceiling, cap-refusal feedback. Pool = 3 FW + 1 HP × team size.

Leg preview — revive ntBuildBridgeInto as the chained edge-to-edge lane strip; the chain is the deposit target.

Summary — ntIsDNP() branch: team Cycle Leader + team scoreboard with per-member contributions, rolling team average from ntTeamCycleSERs, stale ntOverallSER comment fixed.

Journey slide — clip wrapper on the canvas, direction reversed.

Closure — SW v191, verify-nt-loopback.js green across seeds, visual-check on the two presentational items, then one documentation pass (nt-impl-notes, code-map, game-identities § 13, decision-log).

Confirm and I'll build it in that order — allocation last, since the preview rework feeds it.

Just completed: design settled on the tally-deposit allocation model, with the honeypot ceiling conflict caught before implementation.

Next: build the four items as one batch — Opus, high effort, same session (the nt.js regions are loaded and this is a direct follow-on).

