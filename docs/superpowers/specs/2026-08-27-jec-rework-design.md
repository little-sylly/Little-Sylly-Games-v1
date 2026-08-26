# Just Enough Cooks — Rework Design

**Date:** 27 August 2026 · **Game:** Just Enough Cooks (`jec`, game 4) · **Status:** APPROVED by owner 27 Aug 2026 — awaiting implementation plan
**Tier:** 2 — Architectural (new mechanics, new Sylly Mode, packet changes, suite-wide copy rewrite)

---

## 1. Decision

Just Enough Cooks is reworked in two halves:

1. **Standard mode gains real decisions.** The Sylly Mode mechanic that was worth keeping (Signature
   Dish) is promoted into standard play *and made an actual choice*; the one that fought the game
   (Poison Word) is retired and replaced by **The Crutch**, a read-the-table prediction. A new
   opt-in **Special Instructions** setting modifies the prompt to flatten the obvious head of the
   answer distribution. The Sous Chef merge pass moves *before* the reveal, and the reveal becomes a
   staged beat rather than a static table.

2. **Sylly Mode is replaced by Fusion Cuisine.** Two Orders combine into one imagined dish; Chefs
   write three ingredients *and* a name for the fused dish in a single prep pass, then vote on the
   best name for a bonus.

A full terminology and flavour-text pass runs across both halves.

**Owner approval, 27 Aug 2026 — settled, do not re-litigate in the plan session:**

1. **Both verification harnesses are in scope** (§ 8) — `tools/verify-jec-loop.js` and
   `tools/verify-jec-loopback.js`. JEC has none today; this rework changes scoring and seven
   packets, so it does not ship on inspection alone.
2. **Bug J2 is closed as part of the copy rewrite** (§ 4.4), not left as an open note.
3. **Option B (Kitchen Chaos Roles) is retired** from the JEC impl-notes Template Gaps as superseded
   by this design (§ 10). Option A (Secret Sous-Chef) remains parked.

Every mechanic, scoring value, setting and term below is likewise owner-approved. The plan session's
job is sequencing and implementation detail — not reopening design.

**Rationale.** The game is structurally bland for five reasons, in severity order:

| # | Problem | Fixed by |
|---|---------|----------|
| 1 | The target cannot be aimed at — three words into a void, a number comes back, no information to reason with | The Crutch (a real read); Signature nomination (a real bet) |
| 2 | Three ingredients are three identical parallel lotteries with no trade-off between them | Signature nomination — slot choice becomes a decision |
| 3 | The prompt has an obvious head ("Pizza" → cheese, tomato, pepperoni) so the 2-match band is luck | Special Instructions (standard); Fusion (Sylly) |
| 4 | The peak moment renders as a spreadsheet, interrupted by spelling admin | Merge-before-reveal; staged ascending reveal |
| 5 | No player ever affects another player | The Crutch; the Fusion name vote |

Menu Complexity attacked the wrong axis — a harder *dish* (Bouillabaisse) does not widen the
interesting band, it makes every Chef fail together. Special Instructions and Fusion both widen the
band by making the prompt less predictable rather than less known. This is the single unifying idea
of the rework: **modify the prompt to flatten the head.** Standard and Sylly are the same move at
two intensities.

---

## 2. Standard mode changes

### 2.1 Signature Dish — promoted, and made a choice

**Was:** Sylly-Mode-only, hardcoded to ingredient slot 0 (`jecSignatures[p] = 0`). Not a decision —
just a reason to front-load.

**Now:** standard mode, every round. After typing three ingredients, the Chef **taps one** to
nominate it as their Signature Dish. No extra typing. If that ingredient lands in the Golden range
(**Chef's Kiss** or **Crowd-Pleaser**) it scores **double**.

- The double applies to the Golden range **only** — never to a Too Many Cooks token reward. (The
  current code doubles any positive score, including the token; the identity doc already describes
  Golden-only. The doc is correct, the code is not.)
- A Signature that lands **Table for One** or **Too Many Cooks** scores its normal value (including
  a penalty if that penalty is ON). There is no extra loss for a failed Signature — the loss is the
  double you didn't get.
- Nomination is **mandatory**. No default; the Serve it Up! CTA is blocked until one is tapped, in
  the same way the three ingredients are.

This is the game's first genuine trade-off: back the word you are confident about, or gamble the
double on the weird one.

### 2.2 The Crutch — replaces Poison Word

**Was:** every Chef planted a secret Poison Word; any Chef whose ingredient matched it scored zero.

**Why it goes.** It zeroed *matched* ingredients — so the game's single best moment (you and one
other Chef both wrote "pineapple") became worth nothing, at random, from someone who was not aiming
at you. It punished exactly the behaviour the base game rewards, and cost a mandatory fourth text
entry to do it.

**Now:** the same input field, inverted into a read of the table.

> **Call the Crutch** — the one ingredient you reckon the kitchen can't help but reach for.

Rules:

- One word. **Must not be one of your own three ingredients** (the same validation the Poison Word
  already had).
- **The Crutch does not enter the frequency pool.** It is a prediction, not a submission — it must
  never inflate a count. This is load-bearing: a Crutch that counted would let a Chef manufacture a
  Crowd-Pleaser for themselves.
- Pays a flat **half-jackpot** (`round(jecGoldenScore * 0.5)`) if the called word is at the round's
  **top count** (ties all pay) **and** that count is **≥ 3**. Otherwise nothing. A miss costs
  nothing.
- The Crutch resolves through the merge map exactly as an ingredient does, so a Sous Chef merge
  applies to it too.
- Called correctly, the badge is **Called It! 📣**.

**Why "top count and ≥ 3" rather than "hit Too Many Cooks".** Literal all-N is common at 3 players
and rare at 6 — the difficulty would swing wildly with table size. "Top count, ≥ 3 Chefs" has
exactly one right-ish answer at any player count, and it gives **Too Many Cooks a purpose it has
never had**: one Chef is hunting the very thing everyone else is trying to avoid. A free miss is
correct because the natural hit rate is low.

The Crutch is **always on in standard mode** — it is not a setting.

### 2.3 Special Instructions — new setting, default OFF

A second deck modifies Today's Order. **One instruction per Order; instructions never stack with
each other.**

> **Pizza** — *…at 3am* · *…to impress the in-laws* · *…on a $5 budget*

The deck is a shuffled array in `js/games/jec.js`, popped per Order like the word pool, so a game
does not repeat an instruction until the deck is exhausted. **Specials Board rerolls redraw the
instruction along with the Order.**

**The twenty instructions, in four groups:**

| Group | Instructions |
|---|---|
| **Budget & constraint** | …on a $5 budget · …using only what's at the petrol station · …in one pan, ten minutes flat · …camping, no power |
| **Occasion** | …for family dinner · …to impress the in-laws · …as takeaway, before a night out · …for a barbecue in 38° heat · …in a school lunchbox · …to feed twenty people |
| **Standard** | …going for a Michelin star · …prepared by a five-year-old · …at 3am · …as a hangover cure |
| **Chaos** | …but it's entirely beige · …but it has to be green · …but make it breakfast · …but make it dessert · …air fryer only · …spicy enough to hurt |

**Selection criterion for any future addition: the instruction must change the ingredient list.** A
line that is merely funny but leaves the same three answers correct does not qualify. *For a picnic*
and *for your fussiest mate* were drafted and cut on exactly this test.

**Why it is a setting and not always-on.** Plain dishes stay the baseline the game was designed
around, and a table that likes the pure form keeps it. Default OFF.

**Accessibility note (the real motivation).** The repetition complaint — the same ingredients every
game — is only half a vocabulary problem. An instruction gives a Chef *an angle to think from*
rather than requiring recipe knowledge: "$5 budget" is answerable by anyone. Twenty instructions ×
100 food words ≈ 2,000 prompts.

### 2.4 Merge before the reveal — an integrity fix, not only pacing

**Was:** the Sifting screen showed counts *and* badges, and the table merged near-duplicate
spellings on top of the scored board.

**The hole:** a Chef could push a merge that raised their own count. The merge decision was made
with full knowledge of what it was worth.

**Now:** `screen-jec-sifting` gains two sub-states, mirroring how `screen-jec-prep` already works:

1. **Sous Chef's Check** — a plain, unscored, alphabetical list of every ingredient. No counts, no
   badges, no Callouts. Merges happen here, blind.
2. **The Tasting** — counts, badges, Callouts and Signature markers revealed.

Blind merging removes the incentive entirely, and the peak moment stops being interrupted by
spelling admin. **Sous Chef's Check is skipped whole when the Sous Chef Check setting is OFF.**

Host-only gating (bugs J3/J4) carries over unchanged: `jecCanOversee()` still governs every
oversight affordance, and clients see a read-only board.

### 2.5 The Tasting is a reveal, not a table

Ingredients reveal **in ascending order of count** — Table for One first, Chef's Kisses landing in
the middle where the reactions are, Too Many Cooks last. Same data, staged.

- Reveal is a staggered entry (30–80 ms between rows per `ui-style.md` § Motion Standard), animating
  `transform`/`opacity` only.
- The Callouts section (each Chef's Crutch) reveals **after** the ingredient list has finished — the
  Crutch result is the round's punchline, not its preamble.
- Reduced motion is already handled globally; no per-feature guard.

This is the cheapest change on the list and the largest single improvement to how the round *feels*.

### 2.6 Scoring — deliberately unchanged

The Phase 29 tier formula stays as-is.

| Count | Badge | Points |
|---|---|---|
| 1 | **Table for One 🍽️** | 0 — or **−5** if Table for One Penalty is ON |
| 2 | **Chef's Kiss ✨** | `jecGoldenScore` (10 / 20 / **30**) |
| 3 … N−1 | **Crowd-Pleaser 👌** | `round(golden × 0.5)` |
| N | **Too Many Cooks! 🍲** | `round(golden × 0.15)` — or **−2 × count** if Crowded Kitchen Tax is ON |

Plus, per Chef per round:

| Bonus | Condition | Points |
|---|---|---|
| **Signature Dish 🌟** | nominated ingredient lands Chef's Kiss or Crowd-Pleaser | that ingredient's score **doubled** |
| **Called It! 📣** | Crutch is at top count with count ≥ 3 | `round(golden × 0.5)` |
| **On the Menu! ⭐** *(Fusion only)* | your dish name wins the vote | `round(golden × 0.5)` |

All three bonuses are the **same size** — half a jackpot — so the game carries one bonus magnitude
rather than three magic numbers.

**Two known lumps, both accepted deliberately:**

- **At 3 players there is no Crowd-Pleaser band.** 2 Chefs is the jackpot, 3 is the token, nothing
  in between. The alternatives were a decaying formula or raising the floor to 4. Neither is worth
  it: Phase 29 already learned that a clever formula *feels* punitive even when the maths is fair,
  and the four named badges are the game's best teaching tool. **3 players is documented as "binary
  and fast."**
- **The Crowd-Pleaser band is flat.** At 6 players, matching with 2 others pays the same as matching
  with 4. A decay curve costs the badge system its legibility for a difference players will not
  feel. Left flat.

Opt-in penalty priority is unchanged: a penalty *replaces* the tier reward for that count, never
stacks with it.

---

## 3. Sylly Mode — Fusion Cuisine

**Kitchen Nightmares is retired entirely** — both its mechanics are gone, one promoted and one
replaced.

**Fusion Cuisine.** Two Orders drop together — *Sushi* + *Pizza*. Chefs write three ingredients for
the **imagined fused dish**, plus **a name for it**.

**Fusion is standard mode plus two additions, not a replacement for it.** Signature nomination, The
Crutch, the tier table, both penalties and Sous Chef Check all behave exactly as they do in standard
play. Fusion adds only the second Order and the Name the Dish beat.

### 3.1 Why fusion is a fix, not just flavour

"Pizza" has a guaranteed first instinct. **"Sushi Pizza" does not** — so the 2-match sweet spot
becomes reachable by *thought* rather than luck. Fusion flattens the head of the distribution, which
is precisely what root cause #3 needs. It is the same structural move as Special Instructions, one
intensity up.

### 3.2 Name the Dish

**The name is entered on the prep screen, in the same pass as the ingredients.** This is the design
decision that keeps the mode tight: folding the name into prep costs **+0 handoffs**. Only the vote
is a new beat.

- **Lobby Mode:** every Chef votes simultaneously on their own device, gated by a
  `jecMpVoteCheck` matrix.
- **Pass-the-Phone:** one shared screen listing every name, cycling through Chefs on the one device
  ("Sam, pick a name" -> tap -> next Chef). **No pass gate** — the names are public, so there is
  nothing private to protect and the § Pass-the-Phone Safety Gate rule does not apply.
- **A Chef cannot vote for their own name** — their own entry renders disabled, not hidden, so the
  ballot reads the same for everyone.
- Winner (most votes) takes **half a jackpot** and the name goes **On the Menu! ⭐**.
- **Ties: every tied name takes the full bonus.** No tie-break — a tie means two names were both
  funny, and a runoff costs another pass for no gain.
- A Chef who submits no name is simply not on the ballot (validation should prevent this; the
  fallback exists for a dropped packet).

### 3.3 Flow position

The vote runs **after The Tasting and before The Tally**, so The Tally shows the round's complete
score including the name bonus. One score screen per round, not two.

### 3.4 Interaction with Special Instructions

**They stack.** "Sushi + Pizza, on a $5 budget" is workable and funny, and they are independent
settings — not the kind of genuine conflict `ui-style.md` § Mutually-exclusive / superseded exists
for. **Flagged for playtest:** if three constraints prove to be one too many, making them mutually
exclusive is a small, well-patterned change.

---

## 4. Terminology and flavour — final

### 4.1 Australian English

**Australian *spelling* remains mandatory** (colour, flavour, savoury, barbecue) and metric units
stay — that is a project rule and is untouched. What this pass dials back is **slang**: *servo* →
**petrol station**, *barbie* → **barbecue**. "Petrol station" was chosen over "7/11" to keep a
trademark out of game copy.

### 4.2 Changes

| Was | Now | Why |
|---|---|---|
| A Bit Pongy! 🤢 | **Table for One 🍽️** | Slang, smell-based (wrong sense), and it called the ingredient *bad* when the only thing wrong with it is that nobody joined you. Wry, not insulting. |
| Nice Match! 👌 | **Crowd-Pleaser 👌** | The one badge with no personality. Tiers now escalate cleanly: alone → perfect pair → crowd-pleaser → too many cooks. |
| The Pantry Cabinet 🍳 | **The Pantry 🍳** | A pantry *is* a cabinet. |
| Dishes *(setting)* | **Courses** | The CTA already said "Next Course". Courses-in-one-meal makes "Final Wash-up" land. |
| Menu Complexity — Home Cook / Sous Chef / Head Chef | **The Menu** — Everyday / Restaurant / Fine Dining | Pills named the *cook*; the setting is about the *food*. "Sous Chef" also collided with Sous Chef Check on the same screen. |
| Sous Chef Oversight | **Sous Chef Check** | "Oversight" means both *supervision* and *mistake*. |
| Rotten Penalty | **Table for One Penalty** | Orphaned when "Pongy" went. Both penalties now name the badge they punish. |
| Spoilt Penalty / *Crowded Kitchen Tax* | **Crowded Kitchen Tax** | Two names for one setting. The funnier one wins. |
| Today's Recipe | **What Went In** | "Recipe" read as the dish, which is the Order. |
| The Sifting *(one screen)* | **The Sifting** — sub-states **Sous Chef's Check** → **The Tasting** | Kept, now two beats (§ 2.4). |

**Kept:** Today's Order · Chef's Kiss ✨ · Too Many Cooks! 🍲 · The Sweet Spot · Specials Board ·
Signature Dish · The Tally · Final Wash-up · Chef's Cook Book 📖 · New Shift · Kitchen Closed? ·
Won't Spoil the Broth! · "The broth is simmering…" · "Serve it Up!"

*Considered and rejected:* **The Bill 🧾** for The Tally — restaurant-voiced, but "bill" implies cost
where the number is a reward.

**Retired with Poison Word:** Kitchen Nightmare! 🧪 · Health Inspector's Report · "Add a dash of
Sabotage" · Kitchen Nightmares.

### 4.3 New terms

| Term | Meaning |
|---|---|
| **Special Instructions** | The prompt-modifier setting. Default OFF. |
| **The Crutch** | The called ingredient — "the one the kitchen can't help but reach for." Prompt: *Call the Crutch*. Descriptive line: *"Every kitchen has one. Call the culinary cliché everyone leans on."* |
| **Called It! 📣** | Badge for a correct Crutch. |
| **The Callouts** | The Tasting-screen section listing every Chef's Crutch. Replaces Health Inspector's Report. |
| **Fusion Cuisine** | Sylly Mode's name. |
| **The Fusion** | The two-Order pairing. |
| **Name the Dish** | The naming beat, folded into prep. |
| **On the Menu! ⭐** | Badge for the winning fusion name. |

### 4.4 Copy bug folded in

**Bug J2** (`jec-implementation-notes.md`, open since the June 2026 audit) is fixed as part of the
copy rewrite rather than left standing: the how-to states the Table for One penalty as **−10** when
code and settings both say **−5**, and describes the Crowded Kitchen Tax as "−2 per *extra* Chef"
when it is −2 per Chef **including you**.

---

## 5. Settings — final table

| Setting | Options | Default | Notes |
|---|---|---|---|
| **Courses** | 3 · 5 · 10 | 3 | Renamed from Dishes. |
| **The Menu** | Everyday · Restaurant · Fine Dining | Restaurant | Renamed; pills renamed. Filter logic unchanged (`easy` = difficulty 1, `mixed` = ≤ 2, `hard` = 3 only). Its DD-13 value line needs repointing to the new pill names. |
| **The Sweet Spot** | 10 · 20 · 30 pts | 30 | Unchanged. Now also sets all three half-jackpot bonuses. |
| **Table for One Penalty** | OFF / ON | OFF | Renamed. −5 pts. |
| **Crowded Kitchen Tax** | OFF / ON | OFF | Renamed. −2 × count. |
| **Sous Chef Check** | OFF / ON | ON | Renamed. Now gates the **Sous Chef's Check sub-state**, which is skipped whole when OFF. |
| **Specials Board** | OFF / ON | OFF | Unchanged. Now also redraws the Special Instruction and, in Fusion, both Orders. |
| **Special Instructions** | OFF / ON | OFF | **New.** |
| **✨ Sylly Mode** | OFF / ON | OFF | Now **Fusion Cuisine**. |

Nine settings. `✨ Sylly Mode` stays last per `ui-style.md` § Settings Layout Standard; Special
Instructions sits directly above it as an ordinary card — **not** the sanctioned exclusivity-partner
slot, since the two are not exclusive (§ 3.4).

---

## 6. Screen flow

| # | Screen | Beat | Change |
|---|---|---|---|
| 1 | `screen-jec-menu` | Menu | Copy only |
| 2 | `screen-jec-roster` | Kitchen Roster | Unchanged |
| 3 | `screen-jec-order` | Today's Order | **Renders the Special Instruction; in Fusion renders two Orders** |
| 4 | `screen-jec-prep` | Prep (entry / pass gate) | **Signature tap; Call the Crutch; Fusion name field** |
| 5 | `screen-jec-sifting` | **Sous Chef's Check → The Tasting** | **Split into two sub-states** |
| 6 | `screen-jec-name-vote` | **Name the Dish** | **New — Fusion only** |
| 7 | `screen-jec-tally` | The Tally | Now includes bonus lines |
| 8 | `screen-jec-washup` | Final Wash-up | Copy only |

Rows 3–7 loop once per Course. Row 6 appears only in Fusion Cuisine.

**`screen-jec-name-vote` must be registered in `allScreens[]`** (`engine.js`) — per
`logic-engine.md` § Screen Routing, an unregistered screen becomes a ghost that never hides.

**Overlays:** `jec-settings-overlay`, `jec-how-to-overlay`, `jec-quit-overlay`,
`jec-oversight-overlay`, `jec-new-shift-overlay`, `jec-help-tip-overlay` — all retained. No new
overlay. `jec-new-shift-overlay` is **z-[80] and should be z-[90]** per `logic-engine.md`
§ Play-Again Confirmation (open polish item from the June 2026 audit — fix while in the file).

**No How-to gallery tab.** JEC has no render seam and no artwork (identity doc T9); the tab-bar
standard does not apply.

---

## 7. Multiplayer

JEC is a Phase-22 game: **its MP handlers live inline in `js/engine-multiplayer.js`** (~lines
1176–1270), not in a `jecHandleEnvelope` in the plugin. All packet work lands there.

### 7.1 Packet changes

| Packet | Type | Change |
|---|---|---|
| `JEC_ORDER` | SYNC | **+`instruction`** (string, `''` when OFF) · **+`word2`** (string, `''` when not Fusion) |
| `JEC_PREP_SUBMIT` | ACTION | **−`poison`** · **+`crutch`** · **+`signatureIdx`** (0/1/2) · **+`fusionName`** (`''` when not Fusion) |
| `JEC_SIFTING` | SYNC | **−`jecPoisonedNorms`, −`jecPoisons`** · **+`jecCrutches`** (string[N]) · `jecSignatures` retained, now real nominations |
| `JEC_TASTING` | SYNC | **New** — host advancing Sous Chef's Check → The Tasting |
| `JEC_NAME_VOTE` | ACTION | **New** — Fusion; client → host, `{ playerIdx, votedForIdx }` |
| `JEC_NAME_RESULT` | SYNC | **New** — Fusion; `{ votes, winners, bonus }` |
| `JEC_MERGE` | SYNC | Unchanged (now fires during Sous Chef's Check) |
| `JEC_TALLY` | SYNC | **+ per-Chef bonus breakdown** so clients render the same Tally |
| `JEC_WASHUP` | SYNC | Unchanged |
| `JEC_NEXT_ROUND` | SYNC | Remains a deprecated no-op (J4) |

### 7.2 Rules that bite here

Each of these is a documented failure mode this change is directly exposed to:

1. **Firebase erases every empty value** (`logic-engine.md`). `null`, `{}` and `[]` are **deleted in
   flight**; `''`, `0` and `false` are safe. **Use `''` for every absent string**, never `null`.
   `jecCrutches` (an array that is all-`''` if nobody called) and `jecSignatures` must be **sent
   explicitly and rebuilt on receipt** via a normaliser taking `(value, count, fill)` — never
   assigned raw. `cjarWireArr` in `js/games/cjar.js` is the reference shape.
2. **Host readyCheck must be processed directly, never self-sent** — the dedup guard drops
   `originId === syllyDeviceUid`. This already bit JEC once (bug **J1**) and applies identically to
   the **new `jecMpVoteCheck` matrix**.
3. **A readiness gate reading a per-seat array must be asserted per mode** (CJAR BUG-05):
   `[].every()` is `true`. The vote gate must be checked in Pass-the-Phone *and* Lobby Mode.
4. **Host-gate every advance CTA** (J4): the Sous Chef's Check → Tasting CTA, the vote-result CTA and
   the Tally CTA all need the `jecSetAdvanceCta` waiting state on clients.
5. **Client early-return on every host-only interaction** (J3): the new vote screen is
   client-*interactive* (clients do vote), so the guard applies to the **resolution**, not the vote —
   only the host tallies votes and broadcasts `JEC_NAME_RESULT`.
6. **Mid-Game Quit Contract** — already satisfied via `mpNotifyPlayerLeft()` (SW v210). No change,
   but `node tools/verify-mp-configs.js` must still pass afterwards.

### 7.3 Bounds

`getMaxPlayers`/`getMinPlayers` stay constants (6 / 3, fixed in SW v210). **Nothing in this rework
may make a lobby bound read game-local setup state.**

---

## 8. Verification

**JEC currently has no harness at all.** This rework changes scoring, adds two bonuses, and rewrites
seven packets — it should not ship on inspection alone. Two new harnesses:

| Harness | Covers |
|---|---|
| `tools/verify-jec-loop.js` | Tier boundaries at N = 3…6 · Signature double applying to Golden **only** · Crutch top-count/≥ 3 resolution incl. ties · **the Crutch never entering the frequency pool** · merge-map resolution for ingredients *and* Crutches · both penalties replacing (never stacking with) tier rewards · Special Instructions deck exhaustion without repeats · Fusion vote tallying, self-vote rejection, tie payout |
| `tools/verify-jec-loopback.js` | Host↔client over a Firebase-shaped **wire** with a **real mock DOM** — accepts `JEC_SRC=`. Asserts every packet in § 7.1 survives the wire with empty values intact, the vote readyCheck fires in both modes, and no render throw escapes a SYNC applier. |

Per `logic-engine.md` § MDLM Patterns, the loopback **must** have a `fbWrite`/`fbRead` pair (not a
direct handler call) and real mock elements (not `getElementById: () => null`) or it will pass while
the game is broken. `tools/verify-cjar-loopback.js` is the reference.

Also re-run: `node tools/verify-mp-configs.js` (18 games) and `node tools/verify-identity-docs.js`
(copy blocks must move in lockstep with `index.html`).

**Layout** is a fourth tier no harness reaches — the new vote screen and the two Sifting sub-states
warrant the **`visual-check`** skill. And none of it substitutes for a real multi-device session.

---

## 9. Implementation constraints

- **Never use the Edit tool for systematic changes to `index.html`** — it produces UTF-8 mojibake.
  Use a Node script. This rework touches a large amount of JEC markup, so this is a live risk.
- **Never full-read `index.html`** (~515 KB). Grep `screen-jec-` / `jec-*-overlay`, then offset-Read.
- Every new screen goes in `allScreens[]`; every new overlay goes in `resetToLobby()` teardown.
- The Tasting's stagger animates `transform`/`opacity` only, ≤ 300 ms per row, 30–80 ms stagger.
- New markup names its transition property (`transition-transform`), never `transition-all`.

---

## 10. Documentation closure (Documentation Integrity Protocol)

1. `docs/code-map.md` — new screen ID, sub-states, the six packet changes, new state variables
2. `docs/game-identities/jec.md` — T5 terminology, T6 settings, T7a flow, **T7b every copy block**,
   T8 rewritten for Fusion Cuisine, T10 player-count feel
3. `CLAUDE.md` — SW bump, Current Focus entry, harness table rows for the two new harnesses
4. `ui-style.md` / `logic-engine.md` — only if a genuinely new universal pattern emerges
5. `docs/implementation-notes/jec-implementation-notes.md` — close **J2**; record the merge-integrity
   finding, the Signature-double code/doc mismatch, and the Crutch-not-in-pool invariant
6. `docs/decision-log.md` — one entry: the rework is architectural

**Template Gaps to resolve first** (per the Implementation Notes skill): the JEC notes carry a
"Future design: Options A and B (Phase 29)" entry. **Option B (Kitchen Chaos Roles) is superseded by
this design and should be closed out.** Option A (Secret Sous-Chef) remains parked.

---

## 11. Deliberately out of scope

- **Curating a JEC-specific dish deck.** The shared `words.json` `food` category (100 words) stays.
  Special Instructions multiplies the prompt space far more cheaply than authoring dishes would.
- **Any art.** JEC has no render seam and gains none.
- **Team Lobby Mode.** JEC has no teams.
- **Reworking The Menu's difficulty axis.** Renamed only. It is a weak axis, but Special Instructions
  now carries the variety load, and removing a shipped setting is a separate decision.
- **A cross-round pantry / used-ingredient ban.** Considered as a repetition fix and rejected: it
  penalises exactly the low-vocabulary player it was meant to help.
