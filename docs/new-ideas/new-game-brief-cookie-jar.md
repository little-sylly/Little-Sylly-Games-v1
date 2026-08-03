# New Game Brief — Cookie Jar
**Document type:** Phase 1 — Design Brief (non-technical)
**Abbreviation:** `cjar` *(confirmed — no collision against all 17 active plugin prefixes)*
**Status:** Draft v5 — the output of a full design-review pass against the running codebase (2 Aug 2026), the first time this brief has been checked against real files rather than reasoned from a generic suite description. **v5 changes, on top of everything v4 fixed:**

- **Brand colour decoupled from card art.** cjar's brand chrome no longer shares a hue with the card illustrations — see §1. This was forced by a real collision: the amber/cookie-brown space this brief originally proposed is Pecking Order's exact brand (`#854D0E`, cream cards, gold accent) — a colour-family check, not a hex-level one, missed it in v4.
- **Stash privacy model rewritten.** The `mpSendPrivate` / True Network Privacy model this brief assumed in v4 is replaced by couch security (public SYNC, private-by-not-rendering) plus a new **Open Book** setting — see §7, §12. The old model would have required a private repair packet on every one of up to ~80 flips a Full Feast match (at v4's 16-card Sylly deck); couch security needs none regardless of deck size.
- **Sylly Mode deck shortened** from a 16-card Raid to ~10 cards + Treat (~11), because the base game's "10–15 minutes" time estimate does not hold for a mode with no early exit — see §8 and the companion doc.
- **Screens 4–6 re-derived against the Stack** (`ui-style.md`'s current canonical layout), not the legacy sticky-footer pattern this brief was written against — see §14. The header's mandatory `[?]`/🔊/✕ chrome is now accounted for by moving the per-match copy-count pips out of the warning strip and into the Cookie Trail overlay.
- **Multiplayer timer model corrected** to host-authoritative (no server exists) with the specific collision this creates against the engine's 8-second sync-lock auto-release flagged for the tech spec — see §19.
- **Sound design reframed as a reuse map** against the suite's existing synthesised catalogue, matching how Force of Nature (PKO) shipped nine events with zero new audio functions — see §16.

Everything else — terminology, deck composition, scoring, the Sylly Mode balance-testing numbers not affected by the deck-size change — is unchanged from v4. See `cookie-jar-sylly-mode-draft.md` v3 for the matching Sylly Mode changes.

**This is still a Phase 1 design document, not a specification** — v5 closes the gaps a real-codebase review pass could find, but the Stage 2 tech spec is where screen dimensions, component reuse, and exact packet schemas get finalised against the actual files. Nothing here should override something that turns out to be true about the actual suite. See §0.1 for which parts are which.

---

## 0.1 Decision Status — how to read this document

Three markers appear throughout. They describe **confidence**, not importance.

| Marker | Meaning | Who should change it |
|---|---|---|
| **[FIRM]** | Design intent. Changing it changes what the game *is* — the fun, the theme, the teaching. Decided by the designer with the game in view. | Designer. Push back if implementation makes it costly, but don't quietly swap it. |
| **[SOFT]** | A considered guess made without full context — screen dimensions, layout arithmetic, timer values, component counts, technical approach. Written down so there's a starting point, not because it's right. | Anyone with the codebase in front of them. Change freely and note what changed. |
| **[OPEN]** | Genuinely undecided. Needs a call from someone. | Flagged in §19 / Open Questions. |

**Rough division:** terminology, card content, scoring rules, settings behaviour and Sylly Mode mechanics are FIRM. Everything dimensional, layout-related, timing-related, or technical is SOFT — §13, §14, §17's layout, §22 and §23 in particular were reasoned from a generic ~390px mobile viewport and standard suite conventions, both of which the real project will know better.

**A note on the word "locked" elsewhere in this document:** where it appears against terminology and content (family archetypes, treat names, vocabulary), it means the designer has settled it and it shouldn't drift. It never means "unchangeable" — it means "changing this is a design decision, not an implementation detail."

---

## 0.2 Terminology Changes in This Revision

Anyone holding an older copy of this brief, or building from it, should apply these first:

| Old | New | Notes |
|---|---|---|
| Operation | **Cookie Raid** (short: **Raid**) | "Operation" is retired everywhere — it survived in §2, §3, §6, §7, §8, §10, §12 and §17 of v3 while §9 and §14 already said Cookie Raid |
| Reach In / Reach | **Take** | Matches the rhyme — "who *took* the cookies". Same meaning in both modes |
| Sneak Out / Sneak | **Sneak Out** — *base game only* | Unchanged in the base game, where it literally means bank and leave the kitchen |
| — | **Play Innocent** — *Sylly Mode only* | Sylly Mode's safe action. Nobody leaves in Sylly Mode, so it needed a different verb: reusing "Sneak" for a stay-put action was the single biggest teaching hazard in v3 |
| Dob | **Dob** | Unchanged. Naming flagged as reversible — see Open Questions |

**Base game actions: Take / Sneak Out. Sylly Mode actions: Take / Play Innocent / Dob.**

---

## 1. Identity

| Field | Answer |
|-------|--------|
| **Full game name** | Cookie Jar |
| **Short nickname / abbreviation** | `cjar` — checked against all 15 active plugin prefixes (`li5`, `gm`, `ss`, `jec`, `ygi`, `lttp`, `nat`, `dsd`, `gth`, `dyb`, `bld`, `pass`, `nt`, `frt`, `shp`) and the 16th in-progress game (`flw`). No collision. Safe to use. |
| **One-sentence tagline** | Who took the cookies from the cookie jar? |
| **Thematic universe** | The "Who Took the Cookie from the Cookie Jar" nursery rhyme/chant, reframed as a kid's secret kitchen mission — sneaking past family members to raid the jar **before dinner**. Playful and cheeky, not tense or high-stakes. |
| **Emoji / icon** | 🍪 |
| **Brand colour preference** | **Resolved v5 — brand chrome decoupled from card art, and the palette rehaul this required is now in progress as its own phase (see §23).** The v4 "caramel/cookie-brown" pick was checked at colour-*family* resolution only and missed a direct hit: Pecking Order's actual brand is `#854D0E` with cream card grounds (`#FDF8EE`) and a gold accent (`#C9A227`) — precisely the warm-brown-plus-cream-plus-gold space this brief proposed. Putting cjar there would have made the two games' chrome, cards, and settings tint effectively indistinguishable. **Fix, confirmed 2 Aug 2026:** cjar's *card art* stays cream-and-brown (protects any art already generated and keeps the cookie-jar warmth); its *brand chrome* (CTAs, pills, toggles, slider, settings tint, modal borders) takes a distinct hue with no card-art obligation — same pattern FRT already uses (banana-yellow cards, `#047857` green accent text). This freed up a wider recolour: BLD moves off yellow to a **dark red** (`#991b1b`, red-800) to visually group with LTTP as the suite's two "social games with negative connotations" (being late / bailing on friends) — also fixing a real accessibility bug, `.game-toggle-on-yellow`'s white-on-`#eab308` combination measured at 1.92:1 contrast, well under WCAG AA; FRT moves to an **electric lemon** (`#FFE500`) with dark ink (stone-800) replacing its own white-on-yellow failure (1.57:1 → 11.9:1); cjar takes the vacated **honey-gold** territory, pushed warmer/deeper than FRT's lemon (`#D4A017`–`#DCA10D` range) so the two yellow-family games stay visually distinct despite sharing a hue family. Exact hex TBD at technical spec against the real card-art warmth per §23; CSS classes `game-toggle-on-cjar` + `cjar-range` per suite convention. **The BLD/FRT recolour is its own shipped phase, sequenced before the tech spec — see the roadmap note at the end of this section.** |

**Sequencing note (added v5):** three things need to happen in order, not all at once: (1) this brief locked at v5, (2) the BLD→red / FRT→lemon recolour shipped as its own phase (touches `styles.css`, `engine.js`, `engine-multiplayer.js`, ~76 occurrences in `index.html`, `bld.js`, `frt.js` — `index.html`'s edits must go through a scoped Node script per the project's encoding-safety rule, never the general-purpose Edit tool, and must not touch `lttp.js`/`li5.js`'s unrelated `yellow-*` utility-colour usages), (3) cjar's Stage 2 tech spec, which can then state its brand hex as a shipped fact instead of a pending promise.

**Time-of-day framing — locked:** this is a **before-dinner raid**, not a midnight one. Mum's locked flavour line ("Told you, no cookies before dinner!") sets it, and it's the framing that makes "Play Innocent" work — the family is awake and in the house, which is exactly why acting casual is a real option. All copy should stay consistent with this; the earlier "Back to bed already?" quit heading is replaced in §9.

---

## 2. The Players

| Field | Answer |
|-------|--------|
| **Player count range** | 3–8 (matches suite constraint and the source game's supported range) |
| **Teams or individuals?** | Individuals — every player for themselves |
| **Are there different roles?** | No — all players do the same thing every Cookie Raid |
| **Is any information hidden from some players?** | Yes — each player's own Cookie Stash (their private banked total) is hidden from everyone else. The in-progress Raid state (revealed cards, the Cookie Crumbs pile) is public to everyone still in that Raid. In Sylly Mode, each player's Favourite and Watcher are visible to that player only. |
| **Minimum meaningful player count** | *[ASSUMPTION: 4]* — research into the source game consistently flags 3 players as noticeably weaker than 4+, because the "does anyone else stay?" tension needs enough bodies for the split mechanic to matter. Still open whether to actively discourage 3-player games in copy. |

No distinct roles. All players are equally trying to build the biggest Cookie Stash across the match.

---

## 3. The Core Loop

**In one sentence — what does a player DO on their turn?**
Every time a new card is revealed, privately and simultaneously choose **Take** (stay for the next card) or **Sneak Out** (bank what you've collected this Cookie Raid and leave).

**What is the central tension or fun moment?**
The simultaneous reveal — watching everyone's Take / Sneak Out choice flip over at once, especially the moment someone realises they're the *only* one still taking (jackpot) or the only one still in when the second matching Caught! card turns up (BUSTED!).

**What type of game is this closest to?**
☐ Word association / description
☐ Deduction / bluffing / social deception
☐ Trivia / knowledge
☐ Climbing / shedding / adjacency-based card game
☑ Something else: **Push-your-luck, simultaneous hidden-choice** (Incan Gold/Diamant family) — none of the suite's existing genre buckets quite cover this.

**Walk through one complete Cookie Raid step by step, in plain English:**

1. At the start of the Raid, the full deck for this Raid is shuffled (see §10 for exactly what's in it — Cookie Cards, remaining Caught! cards, and this Raid's Treat plus any Treats still unrevealed from earlier Raids). **Clarified v5:** unlike Kitchen Rules' On Guard/Standard Burn removals (which permanently remove a specific *Caught!* card from the match), Cookie Cards never deplete — every Raid reshuffles the full 15-card Cookie pool. The deck a Raid draws from is close to a full ~30-card deck every time (minus only whatever Caught! copies earlier busts have burned), which is what makes the "10–15 minute" base-game time estimate in §5 hold — a Raid is short because it self-terminates on a bust or last-leaver, not because the deck itself is shrinking match to match.
2. The top card is revealed to everyone still in the kitchen this Raid.
   - **Cookie Card:** the cookie count on the card is split evenly (rounded down) among every player still in. Any leftover that can't be evenly split stays visible on the counter as Cookie Crumbs, growing the shared pile for whoever leaves next.
   - **Caught! card (a family member):** if no card of that same family member has been revealed yet *this Raid*, nothing happens — just a scare (with a flavour line, see §10). If it's the **second** card of that same family member revealed this Raid, it's **BUSTED!** — skip to step 5.
   - **Treat card:** placed visibly on the counter, uncollected, until someone leaves the Raid alone (see step 4).
3. If the Cookie Raid didn't just bust, every player still in privately and simultaneously chooses **Take** or **Sneak Out** on their own device. **[SOFT — value] A decision timer runs (15 seconds as a starting point); on timeout that player auto-resolves to Sneak Out** (the safe option — they bank what they have rather than being exposed to a bust they didn't choose).
4. All choices are revealed at once.
   - Players who chose **Sneak Out** bank the cookies they've already collected this Cookie Raid, and split evenly (rounded down) any Cookie Crumbs currently on the counter with the other players leaving this same turn. **Any remainder that can't be split evenly stays on the counter as Cookie Crumbs.** If exactly **one** player Sneaks Out alone, they take *all* the Cookie Crumbs, plus any Treat currently on the counter.
   - Players who chose **Take** go back to step 2 for the next card — as long as at least one player is still in.
5. If it busted: every player still in loses all the cookies they collected *this Cookie Raid only* — cookies already safely in their Cookie Stash from previous Raids are untouched. One copy of that family member is permanently removed from the game for the rest of the match (subject to the Kitchen Rules setting — see §7).
6. The Cookie Raid ends — either because it busted, or because everyone remaining has left. Repeat from step 1 for the next Cookie Raid, for as many Raids as the Match Length setting specifies (default: 5).

**Treat carry-forward — completed rule (matches the official source rules):**

| Situation at Raid end | What happens to the Treat |
|---|---|
| Never revealed (still in the deck) | **Carries forward** — stays in the deck for the next Raid, same identity, same value |
| Revealed on the counter, Raid ends in a **BUST** | **Permanently discarded** — lost forever |
| Revealed on the counter, Raid ends because **everyone Sneaked Out** (no solo leaver claimed it) | **Permanently discarded** — lost forever |

*(v3 defined only the first two rows. The third — a Treat sitting on the counter when the last players leave together — was undefined and happens often. Confirmed against the source game, where any artifact still on the path when the round ends is removed from the game regardless of how the round ended.)*

**Is there anything players do simultaneously, or is everything sequential?**
The Take / Sneak Out choice each turn is simultaneous and hidden until reveal. There's no sequential turn order at all — everyone decides at once, every time.

**How does the phone physically move between players?**
Each player uses their own device throughout — no passing.

---

## 4. Rule Relationships & Interaction Matrix

**Not applicable.** There's no beats/outranks/unlocks hierarchy between elements. The only interaction is the matching-pair bust trigger on Caught! cards, fully described in §3.

---

## 5. Winning

| Field | Answer |
|-------|--------|
| **How does a game end?** | After the number of Cookie Raids set by Match Length (default: Full Feast, 5 Raids) |
| **How is the winner determined?** | Player with the biggest Cookie Stash (total cookie value, plus Treat bonus points) at the end |
| **Are ties possible, and if so how are they handled?** | If tied on total value, most Treats collected wins the tie. If still tied: **shared win**, consistent with Pecking Order's precedent. Tied players share the same rank number on the end screen. |
| **Roughly how long should a full game take?** | `[ASSUMPTION: 10–15 minutes for Full Feast, shorter for Quick Snack]` — **this holds for the base game only**, where each Raid self-terminates early on a bust or a last-player-leaves. Sylly Mode always plays its entire deck (no bust, no leaving), so it does not inherit this estimate — see §8 for the correction and the v5 deck-size fix. |

---

## 6. Scoring

| What happened | Who gets points | Roughly how many | Notes |
|--------------|----------------|-----------------|-------|
| Cookie Card revealed and split | Every player still in | Card value ÷ number still in, rounded down | Leftover becomes Cookie Crumbs |
| Player Sneaks Out alone | That player only | All Cookie Crumbs on the counter + any Treat there | The "jackpot" outcome |
| Cookie Raid busts (2nd matching Caught! card) | Nobody | 0 — everyone still in loses that Raid's cookies | Cookie Stash from earlier Raids is safe |
| Special Treat collected (Strawberry Shortbread, Red Velvet, White Choc Macadamia) | The player who collected it | 5 bonus points | See §10 for the deck-entry schedule |
| Super Special Treat collected (French Macarons, Chocolate Truffle Brownies) | The player who collected it | 10 bonus points | See §10 for the deck-entry schedule |
| Cookie Raid ends with nobody ever having collected anything (a "dead" Raid) | Nobody | 0 | Known, inherited weak point — see §19 |

**Cookies vs Crumbs — the distinction:** **Cookies are score.** Once a cookie is in a player's Cookie Stash it is that player's points. **Crumbs are the unclaimed pool on the table** — cookies that are up for grabs but belong to nobody yet. Every uneven split, in either mode, sends its remainder to Crumbs; Crumbs are the only destination for an unsplittable remainder anywhere in this game.

**Treat value is fixed to treat identity, not collection order.** A treat's point value (5 or 10) is a permanent property of that specific treat — Macarons are always worth 10, Strawberry Shortbread is always worth 5, regardless of when they're collected. This is a deliberate deviation from the source game (which ties value to collection order), chosen because it's simpler to teach and the fixed deck-entry schedule makes "later Raids have bigger treats" a learnable pattern rather than a tracking exercise.

**Does scoring feel balanced?**
Inherited weak point from the source game: research found **roughly 2 of every 5 rounds can end with two matching hazards revealed before anyone banks a single point** — a "dead" Cookie Raid. Snack Friendly (§7) is the digital-native mitigation for this, on by default.

**Any outcomes where nobody scores?**
Yes — a busted Raid where nobody had banked anything yet, and any Raid where every player Sneaks Out on the very first card before any cookies are split.

---

## 7. Settings

| Setting (display) | Options | Default | Internal variable | Internal values |
|------------------|---------|---------|------------------|-----------------|
| Snack Friendly | Off / Safe First Grab / Warm-Up | Safe First Grab | `cjarSnackFriendly` | `'off'` / `'safe'` / `'warmup'` |
| Kitchen Rules | Standard Burn / On Guard / High Alert | Standard Burn | `cjarKitchenRules` | `'burn'` / `'on-guard'` / `'high-alert'` |
| Match Length | Quick Snack (3) / Full Feast (5) | Full Feast | `cjarMatchLength` | `3` / `5` |
| Open Book | On / Off | On | `cjarOpenBook` | `true` / `false` |

**Open Book — new in v5.** A toggle, not a mode — resolves the §12 privacy question by making it a player choice rather than a fixed design decision.

- **On (default):** every player's Cookie Stash and in-progress Raid total are visible to everyone, always. This is closer to how the game is actually playable in practice — both the source game and this digital version make totals arithmetically derivable from public splits regardless of what's rendered (see §12), so showing them plainly keeps the game maths-friendly, which matters doubly for the kid audience.
- **Off:** each player's own Cookie Stash and running total stay private to their own device; the reveal shows *your own* delta as an exact number and *everyone else's* qualitatively, via flavour-line copy only (e.g. "Ben tried to dob — but nobody was taking. Backfired!"). This preserves the hidden-score fantasy for tables that want it, without breaking the Sylly Mode reveal's ability to teach the scare-off rule (see §8, §14).
- **Applies in both modes.** In Sylly Mode specifically, Open Book governs Cookie Stash visibility only — a player's Favourite and Watcher (§8) stay private to that player regardless of this setting; they are a different kind of information (assigned once per Raid, strategic to know for yourself, not a running score).
- **Not a network-privacy feature.** With Open Book Off, the underlying state is still public on the shared multiplayer channel (see §12) — the setting controls what's *rendered* on each device, not what's transmitted. This is a courtesy for tables that prefer not to see the numbers, not a security property, and should not be documented as one.

**Snack Friendly — option detail:**
- **Off:** pure original odds — card 1 of a Raid could be a Caught! card, same as the source game.
- **Safe First Grab:** card 1 of every Raid is guaranteed to be a **Cookie Card** specifically.
- **Warm-Up:** cards 1 *and* 2 of every Raid are guaranteed to be **Cookie Cards**.

*(v3 said "guaranteed not to be a Caught! card (forces a Cookie or Treat card)". Allowing a Treat into that slot creates a free jackpot: a solo Sneak Out on flip 1 banks 5–10 points having risked and collected nothing. Forcing a Cookie Card closes it.)*

**Implementation note added v5:** "guaranteed" must mean the deck is shuffled first and a qualifying card is then **floated to the top** (moved from wherever it landed after the shuffle), not a card **prepended** on top of a full shuffle. Prepending on top of an already-complete 30-card deck silently adds an extra Cookie Card and changes the odds for every other flip in the Raid — floating preserves the fixed 15+15 composition and just fixes where one of the existing cards lands.

**Kitchen Rules — option detail:**
- **Standard Burn (default, matches source game exactly):** on a BUST, the family member's 2nd/triggering card is permanently removed from the deck for the rest of the match — that family member gets marginally safer in later Raids. **Note: one copy of three is removed, so that family member is still in play and can still bust a later Raid.**
- **On Guard:** no card is ever removed on a BUST — full hazard density persists across every Raid. `[Note: this is the harder setting, not a gentler one, despite the earlier working name "Endless Pantry" implying cosiness — renamed to avoid that mismatch.]`
- **High Alert Mode:** Standard Burn happens *and* a 4th copy of a random family member is added to the deck for the next Raid, with an on-screen announcement (e.g., "Dad is on High Alert!"). Escalating danger, digital-native twist not possible in the physical original. **This family member needs its own state on the warning strip — see §14.**

**Are there any settings that should be locked or hidden in certain situations?**
Yes. **In Sylly Mode (Dibber Dobber), both Snack Friendly and Kitchen Rules are hidden/disabled entirely.** All of Kitchen Rules' options govern what happens on a bust, and all of Snack Friendly's options exist to prevent an early bust — Sylly Mode has no bust, so neither has anything to act on. **Match Length and Open Book both stay visible and functional in every mode** — Open Book (new in v5) isn't bust-related at all, so nothing about entering Sylly Mode gives it anything to hide. *(v3 hid Kitchen Rules only; Snack Friendly was overlooked.)*

**Do any settings scale automatically with player count rather than being user-facing?**
No. `[Cookie Assortment / deck rebalancing by player count was considered and explicitly deferred — see §19. Not a setting in this draft.]`

---

## 8. Sylly Mode

**Thematic name:** Dibber Dobber *(naming flagged as reversible — see Open Questions)*

**In one sentence:** every card flip becomes a three-way choice — Take, Play Innocent, or Dob — where Take stays the highest-ceiling path to winning, Play Innocent is the safe fallback, and Dob disrupts other players rather than banking a personal fortune.

**Full design, balance-testing history, and decision log:** `cookie-jar-sylly-mode-draft.md` v3 (companion document). Summary below.

### Core change

Adds a third action, **Dob**, and replaces Sneak Out with **Play Innocent**. All three are chosen simultaneously and privately every card flip, same as the base game's two-way choice — no new turn structure.

**Why the safe action is renamed:** in the base game, Sneak Out means bank and *leave the Raid*. In Sylly Mode nobody ever leaves — every player is in for every flip until the deck runs out. Reusing "Sneak" for a stay-put action would teach players the wrong thing on their second session, so the Sylly Mode action is **Play Innocent** (with "Not Me!" as reveal flair). **Take** keeps its name because it means exactly the same thing in both modes.

- **Cookie Cards:** Takers split the value as normal, unless Dobbers are present — Dobbers steal 2 cookies each (capped at the card's value) off the Takers, who split whatever's left (possibly zero, if enough Dobbers showed up). Innocents split the Crumb pile — unless a Dobber is present this flip, in which case Innocents get nothing and the Crumbs stay put for a future flip.
- **Treat cards:** never split. Priority order **Take > Dob > Play Innocent** — whichever of those has a sole player, evaluated in that order, wins the Treat outright. If nobody is uniquely solo, it stays unclaimed and re-contests next flip; if still unclaimed when the Raid ends, it's lost rather than carrying forward. *(Reversed from v3's Sneak > Dob > Reach — the old order handed the biggest prize to the safest action, which cut against Take being the highest-ceiling path, and its original justification — carrying the Treat out with you — doesn't exist in a mode where nobody leaves.)*
- **Caught! cards:** no bust. Each player's fate depends only on their own choice, plus the same Dobber-scares-off-Innocents rule as Cookie cards. Take risks losing cookies to Crumbs — protected if the player is that family member's **Favourite** ("mummy's boy," "daddy's girl," the sibling the pet follows), doubled if it's their **Watcher**. Dob always backfires.
- **Affinities are visible to their own player.** Each player sees their own Favourite and Watcher for the current Raid on their own device, all Raid long, hidden from everyone else. This is strategic information, not a surprise — it's what makes a Take feel dangerous when your Watcher's slot is lit on the warning strip. Reassigned at random each Raid.
- **No elimination, and no leaving:** cookies can never go negative and nobody exits a Raid early. A player at zero stays in and can still win Crumb splits.
- **Crumb Debt:** if a player can't pay a backfired Dob or a caught Take in full, the shortfall is owed to the Crumb pile and their next cookies go there until it's cleared (capped at 6, clears at Raid end). *(New — without it, a player at 0 pays nothing for a Dob and should correctly Dob every single flip, which is degenerate and griefy. Proposed fix, needs a simulation re-run.)*
- **Starting stash: 5 cookies, granted once at the start of the match** — not a per-Raid top-up. Cookies carry across Raids as one running total.
- **Deck — shortened in v5.** The 15 Cookie + 15 Caught! pool is cut randomly to **~10 cards**, **then that Raid's Treat is added** and shuffled — an ~11-card deck. The Treat is added after the cut so it's always in play. *(v3 put the Treat in the pool before the cut, giving it a ~50% chance of never being dealt — roughly half the Treats and half the Treat art would go unseen across a match. v4 fixed that but left the deck at 16 cards, which is the source of the v5 timing problem below.)*

**Why the deck shrank (v5).** Sylly Mode has no bust and no leaving, so a Raid always runs its *entire* deck — at v4's 16 cards, a Full Feast (5 Raids) meant a fixed 80 decision points, each with a 15-second timer. That's structurally different from the base game, where a Raid self-terminates early on a bust or when the last player leaves (typically 6–8 flips) — the brief's "10–15 minutes" time estimate (§5) was computed against that self-terminating shape and does not hold for a mode that cannot end early. Even optimistically fast play (~9 seconds per flip including the reveal) put a Sylly Full Feast at ~12 minutes of pure flipping before considering overhead; at the full 15-second timer it's closer to 20. **Cutting the deck to ~10+1 is the chosen fix over shortening the timer or capping Raid count**, because it also concentrates the Favourite/Watcher mechanic — the mode's actual hook — into fewer flips per Raid instead of diluting it, and because affinities reassign every Raid, more (shorter) Raids preserve more rolls of that mechanic than fewer (longer) ones would. **This changes deck variance and requires a simulation re-run** — see the companion doc, which was balance-tested at 16 cards.

### Does it add new screens or phases?
No new screens — the existing choice controls gain a third button (Dob), the player's own affinity lines are added to their private area, and reveal states gain flavour text for the new outcomes (see companion doc for example copy).

### Does it change scoring?
Yes, substantially — resolution differs per card type. Full rules in the companion doc.

### Does it change the win condition?
No — still the biggest Cookie Stash at the end of the match.

### Does it change settings?
Yes — **both Kitchen Rules and Snack Friendly are hidden/disabled entirely when Dibber Dobber is active.** Both exist to manage bust behaviour, and this mode has no bust.

### Design note
This mode went through extensive simulation-based balance testing before landing here — several structurally different versions of the Dob mechanic were tried and discarded (percentage-based steals, flat totals, uncapped steals) before arriving at "2 cookies per Dobber, capped at card value, remainder to Takers." A late-stage finding — that the safe action could passively dominate a full Raid by harvesting other players' losses with zero friction — led to the "scare-off" rule (Dob's presence also disrupts Play Innocent, not just Take) on both Cookie and Family cards. Full reasoning and the discarded-versions table are in the companion document. **Three v4 changes — Treat priority, Crumb Debt, and the guaranteed Treat deck-entry — are reasoned but not yet simulated, and are flagged as such in the companion doc.**

---

## 9. Thematic Vocabulary

| Generic term | What this game calls it |
|---|---|
| Round | Cookie Raid (short form: Raid) |
| Score / points | Cookies |
| Game over screen heading | Who took the cookies from the cookie jar? |
| Play again | Another Raid? |
| Quit confirm button | Yeah, sneak off. |
| Quit cancel button | Keep raiding! |
| Settings overlay title | **Cookie Playbook** |
| Play CTA (menu) | **Raid the Jar!** |
| Stay (continue the Cookie Raid) | **Take** |
| Leave (bank and exit) — base game | **Sneak Out** |
| Stay put safely — Sylly Mode only | **Play Innocent** |
| Third action (Sylly Mode only) | **Dob** |
| Hazard card | Caught! card |
| The moment 2 matching Caught! cards appear | BUSTED! |
| Artifact-equivalent card | Treat (Special Treat / Super Special Treat — see §10) |
| Leftover cookies on the counter | Cookie Crumbs |
| A player's private banked total | Cookie Stash |
| Cookie Cards, values 1–5 | Handful of Cookies |
| Cookie Cards, values 6–12 | Batch of Cookies |
| Cookie Cards, values 13–17 | Mountain of Cookies |
| The 5 hazard archetypes | Mum, Dad, Big Sibling, Little Sibling, Family Pet |
| Protected family member relationship (Sylly Mode) | Favourite — "you're their Favourite" (e.g. mummy's boy, daddy's girl) |
| Threat family member relationship (Sylly Mode) | Watcher — "they're onto you" |
| Last-place end-screen label | Red-Handed |
| Flip history log | Cookie Trail |
| Unpaid cookie debt (Sylly Mode) | Crumb Debt |

**Reveal flair (not button labels):** "Not Me!" appears on a Play Innocent reveal, "Yes, You!" on a Dob reveal. These are animation/copy moments only — the buttons stay plainly labelled.

**Quit overlay** (per suite Quit Overlay Checklist — must have all 5 elements):
- Emoji: 🍪
- Heading: **"Giving up on the jar?"**
- Subtext: **"Your Cookie Stash will be lost."**
- Confirm: "Yeah, sneak off."
- Cancel: "Keep raiding!"

*(v3's "Back to bed already?" implied a midnight raid, which contradicts the locked before-dinner framing in §1 and Mum's locked flavour line.)*

**Play CTA note:** per the Universal Menu Standard, "Raid the Jar!" is the only game-voiced element on the menu screen — Settings button always reads "Settings" (thematic name lives inside the overlay as "Cookie Playbook"), How to Play is always identical, and "← Back to the Box" is always unchanged.

**On the plural "cookies":** the source rhyme is singular ("who took *the cookie*"), but every player is competing for the most cookies and the score currency is plural, so all copy uses the plural — tagline, end-screen heading, and How to Play alike. Deliberate, not a slip.

---

## 10. Word Bank & Content

| Field | Answer |
|-------|--------|
| **Does this game use the existing word bank (`words.json`)?** | No |
| **If no — what kind of content does it need?** | A dedicated deck data file: 15 Cookie Cards, 15 Caught! cards, 5 Treat cards, plus a flavour-line text pool per family member |
| **Does it need a completely new data file?** | Yes |
| **Any words or topics that should be excluded?** | None identified — kid-friendly theme throughout |

**Deck composition (mirrors the source game's card distribution exactly):**

- **15 Cookie Cards**, values: 1, 2, 3, 4, 5, 5, 7, 7, 9, 11, 11, 13, 14, 15, 17 — displayed via 3 visual tiers, not per-value art: **Handful of Cookies** (1–5), **Batch of Cookies** (6–12), **Mountain of Cookies** (13–17).
- **15 Caught! cards** — 3 copies each of 5 family member archetypes: **Mum** (strict/authoritative), **Dad** (easy-going accomplice), **Big Sibling** (the snitch — can render as older brother or sister), **Little Sibling** (needy, loud — clear age gap from Big Sibling), **Family Pet** (chaotic, non-verbal — dog/cat/parrot flavoured lines).
- **5 Treat cards** — one shuffled into the deck at the start of each Raid per the fixed schedule below. Carry-forward and discard rules are in §3.

**Treat deck-entry schedule — Full Feast (5 Raids):**

| Cookie Raid | Treat added | Tier | Points |
|---|---|---|---|
| 1 | Strawberry Shortbread Cookies | Special Treat | 5 |
| 2 | Red Velvet Cookies | Special Treat | 5 |
| 3 | White Chocolate Macadamia Nut Cookies | Special Treat | 5 |
| 4 | French Macarons | Super Special Treat | 10 |
| 5 | Chocolate Truffle Brownies | Super Special Treat | 10 |

**Treat deck-entry schedule — Quick Snack (3 Raids):**

| Cookie Raid | Treat added | Tier | Points |
|---|---|---|---|
| 1 | Strawberry Shortbread Cookies | Special Treat | 5 |
| 2 | Red Velvet Cookies | Special Treat | 5 |
| 3 | Chocolate Truffle Brownies | Super Special Treat | 10 |

*(v3 had only the 5-Raid schedule, which meant a Quick Snack match never saw either Super Special Treat — two of five Treat art assets unusable in short games, and the "later Raids have bigger treats" pattern never paying off. The rule is now simply: **the Super Special always lands on the final Raid**, whatever the match length.)*

**Example entry (Cookie Card):**
A Cookie Card has: a cookie value (integer, from the fixed list above) and a tier (Handful / Batch / Mountain, derived from the value) which determines its display art.

**Example entry (Caught! card):**
A Caught! card has: a family-member type (one of the 5 above), a display illustration, and a pool of flavour lines for two moments — the 1st reveal (a warning line, e.g. Mum: "Told you, no cookies before dinner!") and the 2nd reveal / BUST (a different line, e.g. Mum: "Hand out of the jar. NOW!"). No numeric value — its only function is the matching-pair bust check.

**Example entry (Treat card):**
A Treat card has: a treat name (one of the 5 above), a display illustration, a tier (Special / Super Special), and a point value (5 or 10, per tier).

**Does the quantity of any content scale with player count?**
No — same fixed 15+15+5 deck regardless of player count, matching the source game (which supports the same unscaled deck from 3 up to 8 players). `[Deliberately reconsidered and confirmed — see §19, Cookie Assortment.]`

| Player count | Total quantity | Notes |
|---|---|---|
| 3–8 | 15 Cookie + 15 Caught! + 5 Treat (fixed) | No scaling |

---

## 11. Custom Visual Assets

| Field | Answer |
|-------|--------|
| **Is there a repeated visual primitive?** | Yes — three: Cookie Cards, Caught! cards, Treat cards |
| **How many distinct faces/types does it have?** | Cookie Cards: **3 tiers** (Handful / Batch / Mountain — no longer 15 unique assets). Caught! cards: 5 distinct family members. Treats: 5 distinct treats across 2 tiers. Plus **1 card back (already generated).** |
| **Should it be skinnable with custom art later?** | `[ASSUMPTION: maybe]` — not decided |
| **Default look for v1** | `[ASSUMPTION: emoji/CSS-first, matching most of the suite's default pattern]` — still open |

Even a "maybe" means the render seam **`cjarRenderCard(id, opts)`** should be built from day one so a skin can be dropped in later without game-logic changes — this is the established suite pattern (`pkoRenderCard`, `flwRenderCard`). Game logic and packets use card ID only; the render function is the single swap point for a future skin pack.

**If items are ever displayed compactly/overlapping:** the revealed-card trail (§14) shows them as small thumbnails in a horizontally scrolling strip. They are never fanned as a hand.

---

## 12. Multiplayer Classification

| Field | Answer |
|-------|--------|
| **Multiplayer mode** | MDLM (Multi-Device Lobby Mode) only — each player on their own device. `multiplayerOnly: true`, `supportedModes: ['mdlm']`. No PTP or TLM variant makes sense for this game — the simultaneous private-choice mechanic fundamentally requires individual devices. |
| **In the ideal multiplayer version, does each player have their own device, or do teams share a device?** | Each player has their own device |
| **Is there any information that must stay private to one player or one team's device?** | **Rewritten v5 — see the Privacy Model note below.** In Sylly Mode, each player's Favourite and Watcher are private to them regardless of settings. Everything else (Cookie Stash, in-progress Raid total) is governed by the **Open Book** setting (§7): rendered on every device when On (default), rendered only on the owner's device when Off. Either way, the *underlying* state travels on the public multiplayer channel — nothing here needs true network-level privacy. |
| **Are there moments where players act simultaneously?** | Yes — every single choice, every Cookie Raid, is simultaneous. There is no sequential turn order. |
| **Are there moments where one device should be locked while another is active?** | No — there's no "active player" concept. Everyone is either deciding or waiting for others to finish deciding. |
| **When it's not a player's turn, what do they see, and can they interact with anything, or is it read-only?** | Not applicable in the usual sense. A player who has already Sneaked Out this Cookie Raid watches the rest play out (read-only) until the Raid ends. In Sylly Mode nobody is ever read-only, since nobody leaves. |
| **Any roles or phases that simply don't work with multiple devices?** | None — this game is arguably a *better* fit for individual devices than the physical original. |
| **Do any settings or events temporarily hide information that's normally visible?** | Yes, as of v5 — the Open Book setting (§7) toggles whether Cookie Stash/Raid totals render for other players. This is new in v5; Dibber Dobber itself (§8) still changes outcomes and adds a third action without hiding anything beyond what Open Book already governs. |

**Privacy model — rewritten v5 (this is the most consequential change in this revision).**

v4 assumed each player's Cookie Stash needed **True Network Privacy** — the `mpSendPrivate` channel FLW pioneered, where hand contents never touch the public Firebase path at all. A design-review pass against the actual codebase found two problems with that:

1. **The privacy claim doesn't hold up even in principle.** A Cookie Card's split is `floor(card value ÷ players still in)` — both the card value and the count of players still in are already public at the moment of reveal. Every player's in-progress Raid total is derivable by anyone doing simple division, whether or not the UI displays it. This is true of the source game (Incan Gold/Diamant) as well — the "hidden stash" has always been a table-etiquette convention, not a real information asymmetry, for the base-game Cookie/Treat math. Sylly Mode is the one place real hidden information exists: Dob steals and affinity-modified losses depend on each player's private Favourite/Watcher assignment, which genuinely isn't derivable from public information.
2. **`mpSendPrivate` is expensive in a way this game would hit hard.** The suite's binding rule (see `logic-engine.md` § Multiplayer Sync Module) is that any privately-held state needs its own private *repair* packet on every mutation, sent from the single function where that state changes — not just at deal time. A Sylly Mode Raid can run up to ~11 flips, each mutating every player's stash; a 5-Raid match is up to 55 mutation points × player count in repair packets, each one a candidate for the exact "client hand freezes, replays silently drop" failure class that PKO's BUG-02 already demonstrated in this codebase.

**Resolution:** Cookie Jar uses **couch security** — the same pattern as NAT/FRT/BLD/SHP. The host resolves each flip and broadcasts the full public state (every player's stash, every delta) in one SYNC; each device simply chooses what to *render* from data it already has. There is no private repair-packet obligation anywhere in the base game. The **Open Book** setting (§7) is implemented entirely at the render layer — a single `cjarStashVisible()`-style predicate gates whether other players' numbers are drawn, following the suite's single-source-comparison rule (the `shpHerdAfterCard` pattern) rather than duplicating the check at every call site. `mpSendPrivate` is used for exactly one thing in this game: each player's Favourite/Watcher assignment, sent once per Raid at Raid-start with no repair packet needed, because that value never mutates mid-Raid.

**Every device renders the same screen and receives the same data.** There is no host/TV screen, and no per-device data split — the deck, the last card, the Crumb pile, the warning strip, the reveal, and (with Open Book On) every player's stash are all identical on all devices. The only two things that differ per device are: (1) with Open Book Off, whether other players' exact deltas/totals are drawn or shown qualitatively (§7, §14); (2) in Sylly Mode, that player's own Favourite and Watcher, which never render on anyone else's screen regardless of Open Book.

---

## 13. Screens — Plain English List

1. Game menu (every game has this)
2. Setup / player names (every game has this)
3. Cookie Raid intro — a shared screen showing "Raid X of [Match Length]", a fresh empty table, and (in Sylly Mode) that player's newly assigned Favourite and Watcher
4. **Main game screen** — the central, persistent screen for the whole Cookie Raid. **This one screen has four states rather than being three separate screens:** *Deciding* (action buttons live) → *Waiting* (this player has locked in, others haven't) → *Revealing* (choices and per-player deltas appear in place) → back to *Deciding*. See §14.
5. BUSTED! screen — shown when a Cookie Raid ends via the second matching Caught! card *(base game only — Sylly Mode has no bust)*
6. Cookie Raid summary — a player's own banked total for that Raid, added to their Cookie Stash
7. End of Match screen — final standings, Red-Handed label for last place

**[SOFT]** *(v3 listed the action choice and the reveal as separate screens 5 and 6 while §14 put both inside screen 4 — an internal contradiction that needed resolving either way. Resolved here in favour of one persistent screen with states, on the reasoning that a Raid can run 15+ flips and three full screen transitions per flip would make the game feel like it's constantly reloading. If the suite's existing screen/transition machinery makes separate screens cheaper or more consistent with the other games, that's a better answer than this one.)*

---

## 14. Complex Interaction / UI Spec

**[SOFT — dimensions and pixel values]. Re-derived v5 against the suite's actual canonical layout.** v4 was reasoned against a generic three-zone `h-screen`/`flex-1`/`flex-shrink-0` sticky-footer layout — the pattern `ui-style.md` explicitly deprecates for new screens as of the June 2026 sweep. The current standard is **the Stack**: Header, Stage, and Controls as siblings in one centred, `overflow-y-auto` column that scrolls as a whole unit rather than pinning Header to the top edge and Controls to the bottom. That changes the constraint this section is solving — card size becomes a legibility decision, not a fixed-height-budget one — so the "must fit without scroll" arithmetic from v4 no longer applies. What's still durable and should carry into the tech spec unchanged: the *list of things the screen has to do* — the states, the two-part warning-strip data, the per-player deltas (now Open-Book-gated), the locked-crumbs state.

**The main game screen (screen 4)** is the one screen worth speccing in plain English before the technical spec, since it's the persistent view every device shows for the whole Cookie Raid.

**Layout — the Stack, not three fixed zones:**

```
┌────────────────────────────────┐
│ HEADER  Raid 2 of 5  [?] 🔊 ✕  │
│ [Family warning strip ×5]      │
├────────────────────────────────┤
│ STAGE                          │
│         ┌──────────┐   ┌──┐    │
│         │ LAST     │   │▤▤│ 9  │
│         │ CARD     │   └──┘    │
│         └──────────┘   deck    │
│  [◀ trail thumbnails ▶ scroll] │
├────────────────────────────────┤
│ CONTROLS  (15s ▓▓▓▓░░)         │
│  [ Take ]                      │
│  [ Sneak Out / Play Innocent ] │
│  [ Dob ]        (Sylly only)   │
│  — after reveal: names + deltas│
│ 🍪 Crumbs: 4                    │
│ YOUR STASH: 12  ·  THIS RAID: 3│
│ ⭐ Mum   👁 Dad     (Sylly only)│
└────────────────────────────────┘
```

**Header must carry the mandatory `[?]` / 🔊 / ✕ chrome** (per `ui-style.md`'s Global UI Protocol — every gameplay screen requires it) **alongside** the Raid counter and the warning strip. v4's header sketch had no room for these three buttons without a second row. Fixing this drove the warning-strip change below — halving what the strip has to show buys the row back. The Crumbs counter moves out of the header into the Controls area's private strip (it's closer, functionally, to the per-player totals it interacts with than to the Raid-level chrome above it).

**Stage area — resolving the v4 conflict. [SOFT — all dimensions]** v4's §14 showed the face-down deck and the last card side by side while §22 specced the reveal card at 280×380px. Two 280px-wide cards cannot sit side by side on a ~390px viewport under the old fixed-height model. Under the Stack this is less binding (the column can be taller than one screen without penalty), but the relative sizing still matters for legibility:

- **The last card is the hero** — centred, ~240×330px as a starting point, adjustable once it's a legibility call rather than a height-budget one
- **The face-down deck is a small stacked badge**, ~56×76px, offset to the right of the card, showing the remaining count. It's a counter, not a second card.
- **The revealed-card trail sits beneath as a horizontally scrolling strip** of ~48×66px thumbnails, newest on the right, auto-scrolled to the end. Tapping any thumbnail — or the last card — opens the full Cookie Trail overlay. Horizontal scroll here is a deliberate, singular exception — it is not used anywhere else in this game — chosen because a card trail reads naturally left-to-right as a timeline, not because vertical space is scarce under the Stack.

**Cookie Trail:** the full scrollable log of every flip this Raid — card revealed, actions chosen, and cookies gained/lost per player. Suite-standard slide-up overlay (same pattern as How to Play and Settings). Opened by tapping the last card or any trail thumbnail. **As of v5, this overlay also carries each family member's copies-remaining-in-match count** (see the warning-strip change below) — the Trail is the natural home for match-level bookkeeping that doesn't need to be on-screen every second.

**Controls area — four states:**

- **Deciding:** two full-width buttons in the base game (Take, Sneak Out); three in Sylly Mode (Take, Play Innocent, Dob), one per row per suite button rules. A decision timer runs as a thin progress bar above the buttons — **[SOFT] 15 seconds as a starting value; tune against how long a real table actually takes** (see §19 — this value interacts directly with Sylly Mode's total match length). **On timeout: base game auto-resolves to Sneak Out; Sylly Mode auto-resolves to Play Innocent** — the safe option in each mode, resolved host-side (see §19 for why this must be host-authoritative rather than per-device). *(Without a timer, one slow player stalls everyone on every flip, 15+ times per Raid.)*
- **Waiting:** this player has chosen; buttons lock into a chosen/confirmed state. **Player name chips fill in as each person locks in — showing only *that* they've chosen, never *what*.** No blocking modal; the rest of the screen stays live and readable. **This state must be driven by the game's own `cjarReadyCheck[]` flag, not by the engine's global `mp-sync-locked` CSS class** — that class self-clears after 8 seconds regardless of whether the flip has actually resolved, which is shorter than the 15-second decision timer (see §19).
- **Revealing:** buttons dissolve and player names populate into the zone matching their choice, **gated by the Open Book setting (§7):** with Open Book On, each name carries its own exact delta chip (`Ava +3`, `Ben −2`, `Cal 0`); with Open Book Off, only the viewing player's own name gets an exact chip — every other player's outcome is shown as a qualitative flavour-line only (e.g. "Ben tried to dob — but nobody was taking. Backfired!"), per the example copy already written in the companion Sylly doc §6. *(Amounts are the interesting part of a reveal — in Sylly Mode a single flip can contain a steal, a split, and a scare-off at once, and names-in-zones alone can't communicate that. Open Book Off still needs this information conveyed; it just conveys it in words instead of numbers.)*
- **Private strip (bottom):** the Crumbs counter, this player's Cookie Stash and in-progress Raid total (subject to Open Book — always shown for the viewing player's own numbers regardless of the setting), and in Sylly Mode their Favourite and Watcher as two short text lines (never subject to Open Book — see §7). Crumb Debt, if any, shows here as a small "owes 2 🍪" chip.

**Header — family warning strip, respecced v5 to one state instead of two.** A persistent row of 5 slots, one per family member, now carrying only:

- **Seen this Raid** (per-Raid) — dim = not yet appeared, lit = appeared once, danger = the next one busts

*(v4 also carried a second, per-match "copies remaining" pip row beneath each icon. That's moved into the Cookie Trail overlay (above) rather than staying on-screen at all times, for two reasons: it frees the header row space the mandatory `[?]`/🔊/✕ chrome needs, and it was mostly dead weight in play — under **On Guard** it never changes at all, and under **High Alert** its display (a slot needing to show 4 pips while others show 3, or fewer once a copy burns) was already awkward to reconcile with the simpler "seen this Raid" glance players actually need every flip. Match-level bookkeeping now lives where match-level bookkeeping belongs — the log — while the header stays reserved for what changes the very next decision.)*

**High Alert state:** when Kitchen Rules is set to High Alert and a family member gets a 4th copy added, that slot needs its own visual treatment on the warning strip — a highlighted/outlined slot — plus the on-screen announcement ("Dad is on High Alert!"). The count itself (3 vs. 4 copies remaining) now lives in the Cookie Trail per the change above; the strip only needs to show *that* this family member is currently escalated.

**Crumbs — locked state.** In Sylly Mode, when a Dobber is present the Crumb pile is visible but unclaimable that flip (the scare-off rule). The Crumbs counter needs a distinct dimmed/locked visual plus a short label, or players will read a working rule as a bug.

**Cookie animation — must float, never sit in the layout flow.** A small, reusable cookie-counter increment/decrement animation plays whenever a player's cookie count changes (gain from a Take, loss from a Family card, Crumb pickup, Dob backfire). Same animation primitive reused across all triggers, different direction (up = gain, down = loss), **per-player-row, not a single global counter** — in Sylly Mode one flip produces simultaneous gains and losses across different players. **New in v5:** this must live in an absolutely-positioned layer over a `position: relative` anchor, not as an inline child of the Stack's column — an in-flow animated element changes the column's height while it plays, which re-centres the entire Stack on every trigger (this is the exact bug `ui-style.md` documents from SHP's first sheep-parade animation). With up to ~11 flips per Sylly Raid this would otherwise fire constantly.

**Motion budget.** The reveal sequence (card flip + sting + delta chips populating) should stay within the suite's documented ceiling for non-overlay motion — animate only `transform`/`opacity`, and keep the whole sequence under roughly 400ms with a 30–80ms stagger between player rows, rather than the longer multi-second reveal a first pass might reach for. Even at the v5 shortened Sylly deck (~55 flips in a Full Feast match, see §8), a slow reveal compounds into real extra playtime.

**Accessibility note:** Take / Sneak Out / Play Innocent / Dob must be distinguishable by icon and shape, not colour alone.

---

## 15. Rule Reference / In-Game Cheat Sheet

**Split across two components as of v5** (previously all handled by the warning strip alone — see §14 for why): the family-member warning strip (§14 header) handles which Caught! types have appeared **this Raid**, passively and always-visibly, without needing a separate overlay. **Copies remaining in the match** — the other half of what players need to judge bust risk — now lives in the Cookie Trail overlay (§14) rather than the header, since it changes at most once per Raid and doesn't need to occupy always-on screen space the mandatory `[?]`/🔊/✕ chrome also needs. The Treat tier reference (5pts vs 10pts) is simple enough to absorb from the How to Play card rather than an in-game lookup.

| Field | Answer |
|-------|--------|
| **What reference material do players need mid-game?** | Which Caught! types have already appeared once this Raid (warning strip, always visible) and how many copies of each remain in the match (Cookie Trail overlay, one tap away) |
| **How do they access it?** | Per-Raid state: always visible, passive strip in the Header zone. Per-match copy counts: inside the Cookie Trail overlay, opened by tapping the last card or any trail thumbnail. |
| **Does opening it interrupt the game, or is it a non-blocking overlay?** | The warning strip is non-blocking and always present. The Cookie Trail is the suite-standard slide-up overlay (Pattern 1) — a light interruption, dismissed the same way as How to Play/Settings. |
| **Is it a static image/asset, or does it need to render dynamically from data?** | Both dynamic — the warning strip reflects per-Raid appearances in real time; the Cookie Trail reflects per-match copy counts plus the full flip log |
| **Does it need a per-skin version if §11 has custom visual assets?** | Only insofar as it uses the same family-member icon assets used elsewhere on the card faces |

---

## 16. Sound Design

`[ASSUMPTION: tone is playful and cheeky, not tense — kids' game, not a heist thriller.]`

**Reframed v5 as a reuse map, not a bespoke sound brief.** All audio in this suite is synthesised via Web Audio — there are no audio files, and every game's sound is built from the shared catalogue documented in `logic-engine.md`. v4's table described 12 bespoke sound *directions* as if they'd each need a new synthesised function; checked against the existing catalogue, every one of them already has a close match, following the precedent Force of Nature (PKO) set — nine events, zero new audio functions, mapped once in a single `PKO_EVENT_SOUND` table kept beside the event registry so a sound can never drift from what it announces. The equivalent here would be a `CJAR_SOUND` map in `js/games/cjar.js`:

| Moment | Existing function | Why it fits |
|---|---|---|
| Cookie Card revealed | `playWhoosh()` | Light, quick — a flip, not an event |
| Caught! card revealed (1st of its type) | `playHullThud()` | A real but non-devastating hit — the "uh oh" scare, not the bust |
| Caught! card revealed (2nd — BUSTED!) | `playAbyssThud()` | The escalated version of the above — same family, bigger impact, matching how PKO reuses it for its own two "big hit" events |
| Choices reveal (drumroll-to-reveal) | `playDone()` | A settling/confirm sting — choices locking into their resolved state |
| Lone player Sneaks Out (jackpot) | `playUnchallenged()` | PKO's rising three-note sting for "winning an Encounter" — same shape of moment: the sole survivor scoops the pot |
| Treat collected | `playSuccess()` | Bright ascending chime — matches "correct/match" semantics exactly |
| Treat collected (Super Special, bigger chime) | `playClashWin()` | Deepened, slower `playSuccess()` variant — already built for "this is the bigger version of a success" |
| Cookie Raid busts, cookies lost | `playBoing()` | Cartoon descending sweep — comedic loss, not harsh |
| High Alert Mode triggers | `playAlarm()` | 3-pulse radar blip — already dramatic, already means "escalation" |
| Decision timer final 3 seconds | `playTick()` | Exact semantic match — countdown tick is what this function is for |
| Dob backfires (Sylly Mode) | `playPoacher()` | Deliberately out-of-ecosystem sting — fits "the accusation boomerangs, badly" the same way it fits PKO's own out-of-place card |
| End of match | `playClashWin()` | Reused from the Treat row above — a warm, celebratory close |

**Net result: zero new synthesised functions required.** This should be treated as a strong signal to keep, not a gap to fill with bespoke audio at Stage 2 — it means Cookie Jar's sound identity comes entirely from *which* existing sounds get reused *where*, exactly like Force of Nature's approach, and any temptation to add a bespoke "cookie jar" jingle should be weighed against that precedent.

---

## 17. End Screen Content Mockup

```
WHO TOOK THE COOKIES FROM THE COOKIE JAR?
[Match complete — 5 Raids played]

🍪 TOP COOKIE THIEF
[Name] — [X cookies]

2nd  [Name] — [X cookies]
2nd  [Name] — [X cookies]   ← shared rank if tied
4th  [Name] — [X cookies]   ← Red-Handed

RAID HISTORY
         R1  R2  R3  R4  R5   TOTAL
Ava       3   0   4   6   2     15
Ben       0   8   4   0   0     12
Cal       5   0   0   3   1      9
Dana      2   0   1   0   0      3

[Another Raid?]        [Leave the Kitchen]
```

- **Heading locked:** "Who took the cookies from the cookie jar?" — long, but it's the whole point of the game
- **Last-place label locked: Red-Handed** *(v3 called this locked in §17 and simultaneously open in §19 — resolved as locked)*
- **[SOFT — layout] The Raid history grid is transposed from v3**: players as rows, Raids as columns. v3's layout (Raids as rows, players as columns) needed 9 columns at 8 players on a ~390px viewport, leaving roughly 40px per player name. Rows scale down the page instead of across it, and 5 Raid columns plus a total fits comfortably at any player count. No horizontal scrolling on this screen.
- Grid always shown — useful even in a short match to see the swings

**Does this table stay useful for very short games?**
Yes — even Quick Snack (3 Raids) is short enough that the grid stays useful.

---

## 18. How to Play — Teaching Points

**Ordered list:**
1. Every Cookie Raid, a new jar is opened.
2. Cards are revealed one at a time — most show cookies, which get split evenly among everyone still taking.
3. Some cards show a family member catching you in the act. The first one's just a scare — but if the *same* family member shows up twice in one Raid, everyone still in loses that Raid's cookies. BUSTED!
4. After each card, everyone secretly decides: **Take** again, or **Sneak Out** and bank what you've got.
5. If you're the only one who Sneaks Out, you scoop everything left on the counter — including any Treat sitting there.
6. Whatever's in your Cookie Stash is safe forever — busting only costs you that Raid's takings.
7. After the last Cookie Raid, whoever's got the biggest Cookie Stash wins.

**Easy-to-miss exceptions to flag explicitly:**
- Being caught twice by the *same* family member busts the Raid — two different family members appearing once each does *not*.
- A bust removes only **one copy** of that family member. They're still around, just a bit less likely.
- Sneaking Out alone is the only way to claim a Treat — if two or more people Sneak Out on the same flip, the Treat stays on the counter for a future flip. If the Raid ends while it's still sitting there, it's gone for good.
- Take too long to decide and you'll automatically Sneak Out — 15 seconds per choice.

**Sylly Mode card:** "✨ Dibber Dobber — three moves instead of two. **Take** grabs cookies. **Play Innocent** keeps you safe and lets you sweep up the crumbs. **Dob** points the finger: if someone Dobs while you're taking, they snatch some of your cookies first — and a Dobber about the place scares Innocents off empty-handed too. Careful: dob when nobody's actually taking and it backfires on you. Nobody leaves, nobody busts, and nobody ever loses everything — worst case you're back to zero and still in it."

---

## 19. Open Questions & Design Notes

**Agreed at the v5 design review pass (2 Aug 2026)** — the first pass checked against the running codebase rather than reasoned from a generic suite description:

- [FIRM] **Brand chrome decoupled from card art** — see §1. Forced by a real palette collision (cjar's proposed hue was PKO's exact brand), not a stylistic preference.
- **BLD recoloured to dark red (`#991b1b`), FRT recoloured to electric lemon (`#FFE500`) with dark ink** — freed by the above, and fixes a genuine WCAG failure in both games' existing white-on-yellow toggle/pill contrast (1.92:1 and 1.57:1 respectively, both under the 3:1 floor for large text). Sequenced as its own phase before cjar's tech spec — see §1's sequencing note.
- [FIRM] **Stash privacy model replaced** — couch security (public SYNC) instead of `mpSendPrivate`, plus the new **Open Book** setting (§7) so hiding stashes becomes a player choice rather than a fixed network-privacy feature. See §12 for the full reasoning; this removes the most expensive multiplayer mechanism in the suite from a game that never structurally needed it.
- [FIRM] **Sylly Mode deck shortened** to ~10 cards + Treat (from 16) — the base game's "10–15 minute" estimate never applied to a no-bust, no-leaving mode that always exhausts its own deck; at 16 cards a Full Feast was a fixed 80 decision points. **Requires a simulation re-run** — the companion doc's balance numbers were tested at 16 cards.
- [SOFT] **Screen 4 re-derived against the Stack**, not the legacy sticky-footer layout the v4 dimensions assumed — see §14. The mandatory `[?]`/🔊/✕ header chrome (missing from v4's header sketch entirely) is accounted for by moving the per-match "copies remaining" pip row out of the always-visible warning strip and into the Cookie Trail overlay; the strip keeps only the per-Raid "seen" state that actually changes the next decision.
- [SOFT] **Multiplayer timer corrected to host-authoritative**, not "server-authoritative" (there is no server in this project's architecture) — pattern matches GTH's `GTH_PHASE2_BEGIN` (host computes and broadcasts an `endTimestamp`; only the host resolves on timeout; clients just display the countdown). See the rewritten "Things that might be complicated" entry below for the specific collision this surfaces against the engine's own sync-lock timeout.
- [SOFT] **Sound design reframed as a reuse map** against the existing synthesised catalogue — see §16. Zero new audio functions required; the "12 bespoke sound directions" in v4 all resolve onto sounds the suite already has.

**Agreed at the v4 design review pass** — mechanics and terminology items below are FIRM; items marked SOFT were reasoned without codebase context and are expected to change:
- [FIRM] **"Operation" retired** — Cookie Raid / Raid is the only round term, across both documents
- **Reach → Take**, and the base game's Sneak Out kept while Sylly Mode's stay-put action becomes **Play Innocent** — the v3 collision (one word, two behaviours) is closed
- [FIRM] **Unclaimed Treat rule completed** — a revealed Treat is permanently discarded when the Raid ends, whether by bust or by everyone leaving; an unrevealed Treat carries forward in the deck. Confirmed against the source rules.
- **Safe First Grab / Warm-Up now force Cookie Cards specifically**, not "anything that isn't a Caught! card" — a forced Treat on flip 1 was a free 5–10 points for a solo leaver
- **Snack Friendly is hidden in Sylly Mode** alongside Kitchen Rules
- **Quick Snack gets its own Treat schedule** — the Super Special always lands on the final Raid, whatever the match length
- **All uneven splits, everywhere, send the remainder to Crumbs** — stated once as a global rule
- [FIRM] **Sylly Mode Treat priority reversed** to Take > Dob > Play Innocent, and "solo" clarified as evaluated in priority order rather than independently per action
- **Sylly Mode Treat is added after the deck cut**, so it's always in play
- [FIRM] **Crumb Debt added** to close the free-Dob-at-zero exploit
- **Sylly Mode starting stash is a one-time match grant**, not a per-Raid top-up
- **Affinities are visible to their own player**, with a private text display
- [SOFT] **15-second decision timer** with a safe-action auto-resolve
- [SOFT] **Screens 4–6 collapsed** into one persistent screen with Deciding / Waiting / Revealing states
- [SOFT] **Warning strip respecified** — per-Raid "seen" state plus per-match copy pips, replacing the incorrect "removed" state, with a distinct High Alert treatment
- [SOFT] **Reveal shows per-player deltas**, not just who chose what
- [SOFT] **Waiting state specified** — non-blocking name chips, no modal
- [SOFT] **End-screen history grid transposed** — players as rows
- [SOFT] **Crumbs locked state** added for the Sylly Mode scare-off rule
- **Quit overlay reframed** to before-dinner, matching Mum's locked flavour line
- **Game-over heading and Red-Handed both confirmed locked** — they were listed as simultaneously locked and open in v3

**Resolved earlier (unchanged):**
- Treat point value → fixed to treat identity, not collection order
- Round terminology, settings menu (Cookie Playbook), Cookie Crumbs, Cookie Stash, Cookie Trail
- 5 family member archetypes locked, with per-archetype flavour pools for 1st-reveal and BUST
- Treat hierarchy locked
- Cookie Card art resolved to 3 visual tiers, not 15 unique assets
- Settings locked: Snack Friendly, Kitchen Rules, Match Length
- **Cookie Assortment (player-count deck scaling) — explicitly deferred, not dropped.** Watch for a "starved" feel in 6–8 player playtests before deciding whether a fix is needed.
- **Dibber Dobber deck variance** — a genuinely random cut of the Cookie/Family pool is kept as-is. Simulation (at the pre-v5 15-card cut size) showed the "12 Family / 3 Cookie" nightmare scenario had only a 0.14% chance of occurring, and even a 30/70 split only happened 2.7% of the time. Deliberately engineering more variance was considered and shelved. **These specific percentages no longer apply at v5's ~10-card cut size and need a re-run** — a smaller cut has proportionally more room to land unusually skewed (see the companion doc §2).
- **Starting stash → 5 cookies** (tested vs 3 — starting at 3 increased first-3-flip wipeout probability from 5.2% to 21.3%). Flagged for tuning if playtesting shows players feel insufficiently pressured.
- The cookie-card-burn Kitchen Rules alternative — not used; Dibber Dobber took a different direction.

**Still genuinely open:**
- Exact brand colour hex within the honey-gold territory vacated by the BLD/FRT recolour (§1, §23) — direction confirmed, specific hex TBD once the recolour phase ships and the real card-art warmth can be checked against it
- Whether "Dibber Dobber"/"Dob" should be swapped for globally legible equivalents (recommendation: keep — see Open Questions)
- ~~Whether to actively discourage 3-player games~~ — **resolved v5:** set `getMinPlayers: () => 4` rather than discouraging via copy (see "Things that might be complicated," above)
- Default v1 art treatment — emoji/CSS-first vs. a bigger illustrated budget
- Simulation re-runs for the three unsimulated v4 changes (Treat priority, Crumb Debt, guaranteed Treat deck-entry) **plus a new v5 item: the Sylly deck-size cut (16 → ~11 cards) itself needs a re-run**, since all existing balance numbers were tested at the old size

**Things flagged from earlier design discussion, explicitly OUT OF SCOPE for this draft:**
- The "damp squib" fix beyond Snack Friendly — largely superseded by Snack Friendly now existing as a real setting, but note Snack Friendly is opt-out (Off exists), so the underlying weak point is still reachable if a player chooses Off.
- PWA-native presentation enhancements: shaking-jar/crumbs visual hinting at a private stash, a public "Greed History Log" showing attempts without outcomes.
- An optional visible running score for younger players who can't track hidden stashes — worth revisiting after playtesting, since 10–15 minutes with no visible score may read as flat to kids even though it's the source game's design.

**Things that might be complicated to implement (flag for Claude Code) — revised v5 against the actual multiplayer module:**

- **Simultaneous reveal via `[abbr]ReadyCheck[]` is an established pattern, not a new shape** (71 occurrences across 9 files — JEC, YGI, NAT, NT, GM, LTTP, DYB all use it). What genuinely is new here is *frequency*: this pattern normally fires once or a few times per round; Cookie Jar fires it up to ~11 times per Raid (Sylly Mode) or more per match than any existing game. That makes one specific, previously-seen bug far more likely to recur: **`cjarChoices[]` / `cjarReadyCheck[]` must be reset to their empty/false values inside the SYNC payload that starts each new flip, not just in the host's local state** — a client that never receives the reset carries the previous flip's values forward and can instantly false-fire `.every(Boolean)` on the next one (this is the documented root cause of FLW BUG-01).
- **The host is also a playing participant, and must process its own choice directly** — never via a self-sent `mpSendEnvelope({type:'ACTION'})`. The engine's dedup guard drops any envelope where `originId === syllyDeviceUid`, so a host that submits its own Take/Sneak Out/Dob choice as an ACTION never has its own seat marked, and `.every(Boolean)` never fires — the round hangs waiting on a submission that already happened. This exact bug has recurred across JEC, YGI, and NT. Pattern: when `syllyMultiplayerMode === 'host'`, set `cjarReadyCheck[mpMyPlayerIdx] = true` and the host's own choice locally, then broadcast the resolving SYNC directly.
- **The Caught! card removal rule** (persistent across the match, with 3 different behaviours depending on Kitchen Rules) needs careful state tracking — but as of v5 the warning strip itself only surfaces per-Raid "seen" state; per-match copy counts moved to the Cookie Trail overlay (§14), which simplifies the component that needs to track both.
- **Kitchen Rules' High Alert Mode** requires tracking a *dynamically added* card (the extra family member copy) that didn't exist in the fixed 15+15+5 base deck — it breaks the "fixed deck" assumption used elsewhere in this brief.
- **The decision timer is host-authoritative, not server-authoritative** — there is no server in this architecture. The correct pattern (already shipped in GTH's `GTH_PHASE2_BEGIN`, `js/games/gth.js`) is: the host computes `endTimestamp = Date.now() + 15000` at the moment the flip starts, broadcasts it in the flip-start SYNC, every device runs its own countdown display against that absolute timestamp, and **only the host resolves** — when its own clock passes `endTimestamp` (plus a small latency-grace window), it auto-fills the safe action for any seat that hasn't submitted and broadcasts the resolution. Clients never self-resolve, so clock skew between devices stays cosmetic rather than a source of desync.
- **New in v5 — this timer collides with the engine's own sync-lock auto-release.** `mpLockSync()` (`engine-multiplayer.js`) auto-unlocks after a fixed 8 seconds to prevent a permanently stuck screen on a dropped packet. A 15-second decision timer means a player who submits early would see their own buttons visually un-grey at the 8-second mark while the table is still waiting on a slower player — **the Waiting-state UI must be driven by the game's own `cjarReadyCheck[]`/phase flag, not by the shared `mp-sync-locked` CSS class**, which is a body-level class shared across every game in the suite and was never designed to track a 15-second window.
- **A quitting client needs its own `CJAR_PLAYER_LEFT` ACTION handler**, per the resolved GTH/DYB/BLD MDLM quit contract: the client's quit-confirm sends it before calling `resetToLobby()` locally; the host's handler calls `resetToLobby()` on receipt, which broadcasts the generic `HOST_END_GAME` and dissolves the match for everyone else via the existing disconnect overlay. Skipping this leaves the host and remaining clients waiting on a seat that will never submit again — and with the decision timer running every ~9–15 seconds all Raid long, that stall would surface almost immediately rather than being a rare edge case.
- **`getMaxPlayers`/`getMinPlayers` should reflect the real floor, not just discourage 3-player in copy.** §5's own research flags 3 players as meaningfully weaker for this game family — the clean fix, matching BLD's precedent (`getMinPlayers: () => 5`), is `getMinPlayers: () => 4` in the `MP_GAME_CONFIGS` entry rather than shipping a configuration known to be weak and papering over it with warning copy. This resolves Open Question 3 rather than leaving it open.
- **Crumb Debt is a per-player, per-Raid ledger that interacts with every gain path** — small, but easy to get wrong, and it must be reset (to zero, for every player) inside each Raid-start SYNC payload for the same reason `cjarReadyCheck[]` must be — an accumulator a client doesn't receive a reset for carries stale values forward.

---

## Open Questions

1. [NON-BLOCKER] **Exact brand colour hex** — direction confirmed v5 (honey-gold, distinct from FRT's electric lemon and PKO's dark amber-brown; see §1), specific hex TBD once the BLD/FRT recolour phase ships and the real card-art warmth can be checked against it.
2. [NON-BLOCKER] **"Dibber Dobber" / "Dob" naming.** Australian/British slang that won't parse for US or international players on first read. **Recommendation: keep it.** "Point" collides with *points* (the Treat scoring currency), the reveal copy already carries the meaning without a glossary, and a Sylly Mode is the right place for regional charm. If a global-legibility swap is ever wanted, **"Tattle" / mode "Tattletale"** is a clean one-for-one replacement — a single find-replace across both documents.
3. ~~[NON-BLOCKER] Whether to actively discourage 3-player games in copy.~~ **Resolved v5:** `getMinPlayers: () => 4`, not a copy warning — see §19.
4. [NON-BLOCKER] Default v1 art treatment — emoji/CSS-first vs bigger illustrated budget (see §22 for dimensions regardless of treatment).
5. [NON-BLOCKER] Whether Cookie Assortment (deck scaling by player count) needs a real setting after 6–8 player playtesting.
6. [NON-BLOCKER] Starting stash of 5 cookies — confirmed as the day-one default, flagged for tuning after playtesting.
7. [NON-BLOCKER] Simulation confirmation for the three reasoned-but-untested v4 changes (Treat priority, Crumb Debt cap and clear behaviour, guaranteed Treat deck-entry) **plus, new in v5, the Sylly deck-size cut itself (16 → ~11 cards) — all existing balance numbers were tested at the old size.**

---

## 20. Mood & References

| Field | Answer |
|-------|--------|
| **Real-world games this is most similar to** | Incan Gold / Diamant (direct mechanical base). Also referenced during design: Flip 7, Zombie Dice. |
| **Tone** | Playful, cheeky, kid-friendly greed and denial — not tense or punishing |
| **Should NOT feel like** | A heist thriller or anything genuinely stressful — busting should feel like a comedic "caught red-handed" moment |
| **Any example phrases or copy you've already written?** | The nursery rhyme itself, plus locked family flavour lines, e.g. Mum: "Told you, no cookies before dinner!" / "Hand out of the jar. NOW!" |

---

## 21. Sample Round

**Setup:** 4 players — Ava, Ben, Cal, Dana. Cookie Raid 3 (of 5) begins. Locked family names used. Treat entering the deck this Raid: White Chocolate Macadamia Nut Cookies (Special Treat, 5 points). Red Velvet Cookies from Raid 2 were never revealed, so they're still in the deck too.

**The deck is shuffled** (remaining Cookie Cards, remaining Caught! cards, and both unrevealed Treats).

1. **Card revealed: Cookie Card, value 9 (a Batch of Cookies).** All 4 players are still in. 9 ÷ 4 = 2 each, 1 Cookie Crumb left on the counter.
   - Ava, Ben, Cal, and Dana each privately choose Take or Sneak Out. Ava chooses Sneak Out; Ben, Cal, and Dana all choose Take.
   - Reveal: **Ava** leaves alone with her 2 cookies — and since she's the *only* one leaving this turn, she also takes the 1 Cookie Crumb. Ava banks 3 cookies this Raid and steps out.
2. **Card revealed: Caught! card — Mum.** First time Mum has appeared this Raid — just a scare ("Told you, no cookies before dinner!"). Her warning-strip slot lights up. Ben, Cal, and Dana are still in.
3. **Card revealed: Cookie Card, value 5 (a Handful of Cookies).** 5 ÷ 3 = 1 each, 2 Cookie Crumbs left on the counter.
   - Ben and Dana choose Take. Cal chooses Sneak Out.
   - Reveal: **Cal** leaves alone — takes his 1 cookie plus the 2 Cookie Crumbs, for 3 cookies total this Raid. He'd also have taken a Treat if one were showing on the counter — neither has been revealed yet.
4. **Card revealed: Caught! card — Mum (again).** Second Mum this Raid — **BUSTED!** Ben and Dana, still in, lose everything they'd collected this Raid (1 cookie each from step 3). One copy of Mum is removed from the game for the rest of the match (under Standard Burn — under On Guard it would stay in play). *(Updated v5: Mum's copies-remaining count, now tracked in the Cookie Trail overlay rather than the header warning strip — see §14 — drops from 3 to 2 there.)*

**Result:** Ava banks 3 cookies to her Cookie Stash, Cal banks 3, Ben and Dana bank 0. Neither Treat was revealed this Raid — both carry forward into Cookie Raid 4's deck, alongside Raid 4's French Macarons.

---

**A moment from a single player's point of view — rewritten v5 for the couch-security model:**
During step 3, from **Ben's** device: he sees the same table state everyone sees (5 cookies just split, 2 Cookie Crumbs, Mum lit on the warning strip as seen-this-Raid). No player's choice is visible to anyone until the reveal, so Ben has no idea Cal is about to choose Sneak Out until it flips. With **Open Book On** (the default), once choices reveal, Ben sees Ava's and Cal's exact running totals exactly as he sees his own — there's no device-level secrecy about Raid totals in this game, because they're already derivable from public splits; Open Book On just shows the arithmetic plainly rather than making players do it in their heads. With **Open Book Off**, Ben's own total stays exact on his own device, but Ava's and Cal's outcomes render as flavour lines only ("Ava sneaks off with the goods!") rather than numbers — the choice itself (that Cal left) is still visible either way, since that's part of the public reveal; only the *exact amount* is gated by the setting.

---

## 22. Asset Spec (Rough — Pre-Screen Design)

This section gives enough dimensional guidance for art to begin in parallel before screens are fully designed. All dimensions are estimates based on standard mobile-first PWA conventions for the suite and will be confirmed/adjusted at technical spec stage.

**[SOFT — all dimensions in this section.]** These were derived from a generic ~390px viewport, not from the real screens. Treat the *asset list* as the useful output — how many pieces of art are needed, and what each has to communicate — and re-derive the sizes.

**Re-derived v5:** the sizing logic below assumed the legacy fixed-height sticky-footer layout (`ui-style.md`'s deprecated pattern), where the Stage got whatever space was left over after a fixed Header and Controls height and everything had to fit without scrolling. The current standard is the Stack — one centred column that scrolls as a whole unit when its content is taller than the viewport — so **vertical space is no longer the binding constraint on card size; legibility is.** The dimensions below are still a reasonable starting point (they were sized to be comfortably readable, not just to fit), but "must fit without scroll" should be read as "should be sized for comfortable reading," not as a hard viewport-height budget.

**General assumptions:**
- Primary target is mobile portrait, ~390px wide (iPhone-class viewport)
- Cards are the central visual element; sizing is now a legibility decision (see note above), not a fixed-height budget
- Three distinct card types: Cookie Cards, Caught! cards, Treat cards, plus one card back
- All card types share the same physical card dimensions for consistency

---

### Card dimensions — revised

| Use | Approx size **[all SOFT]** | Notes |
|---|---|---|
| **Full reveal card** (centre of Stage) | **~240 × 330px** | Kept from v4 as a comfortable reading size — no longer derived from a fixed height budget (see note above), so this is now a starting point for legibility, not the product of viewport arithmetic. |
| **Face-down deck badge** | **~56 × 76px** | A small stacked-card badge with a remaining-count number, offset right of the hero card. Not a second full-size card. |
| **Trail thumbnail** (previously revealed cards) | **~48 × 66px** | Horizontally scrolling strip beneath the hero card. Family member face or cookie tier icon must read clearly at this size. |
| **Treat on counter** (uncollected treat displayed) | ~100 × 136px | Slightly larger than the trail thumbnail since it's an active, collectible item players are eyeing |

*(Claude Code should treat these as a starting point and finalise against the real component library — the constraint to respect is legibility at each size, not fitting a fixed viewport height. The Stack scrolls as a unit, so a taller-than-expected column is not itself a problem.)*

---

### Cookie Cards — 3 art assets needed

Each tier is one reusable asset with the numeric value rendered as a text overlay.

| Tier | Values | Asset description |
|---|---|---|
| **Handful of Cookies** | 1–5 | A small stack of 3–4 cookies, loosely piled. Feels modest, like someone grabbed a couple. |
| **Batch of Cookies** | 6–12 | A fuller plate or pile — maybe 8–10 cookies stacked. Clearly more enticing. |
| **Mountain of Cookies** | 13–17 | An overflowing, teetering tower of cookies. Should feel absurd and delicious. Biggest visual impact. |

Cookie art style note: warm, illustrative, slightly cartoonish — these are kids' game assets, not a food photography brief. Consistent biscuit/cookie type across all three tiers (likely choc-chip, as the default "cookie jar cookie").

---

### Caught! cards — 5 art assets needed

One illustration per family member archetype. Each needs to work at both full-reveal size (~240×330px) and trail-thumbnail size (~48×66px) — the face/expression must read at the small size.

| Archetype | Personality | Art direction (rough) |
|---|---|---|
| **Mum** | Strict, authoritative | Arms crossed, eyebrow raised, pointing finger. Classic "caught you" parent energy. |
| **Dad** | Easy-going, conspiratorial | Surprised but slightly amused. Maybe a finger-to-lips "shhh" gesture — he might want one too. |
| **Big Sibling** | The snitch | Smug, one eyebrow up, already pointing toward "Mum's room." Could read boy or girl — keep it ambiguous or do two variants. |
| **Little Sibling** | Needy, loud | Wide eyes, mouth open mid-wail or mid-demand, arms reaching. Clearly younger/smaller than Big Sibling. |
| **Family Pet** | Chaotic, non-verbal | A dog/cat/parrot face — excited, alert, knocking something over. The chaos agent. Could be multiple animal types shown together if that works. |

Key constraint: all 5 faces need a clear silhouette difference at the smallest size they're rendered at — **[SOFT] ~48px wide on the current numbers** (tightened from v3's 80px, since the trail thumbnail is smaller than originally specced). Mum and Dad should read as adults, Big/Little Sibling clearly as different ages, Pet as unmistakably an animal.

---

### Treat cards — 5 art assets needed

One illustration per treat. Treats should look obviously more special/premium than the Cookie Cards — richer colours, slightly more elaborate presentation.

| Treat | Tier | Art direction (rough) |
|---|---|---|
| **Strawberry Shortbread Cookies** | Special | Pink-iced round biscuits, strawberry decoration, dainty but clearly cookies |
| **Red Velvet Cookies** | Special | Deep red crinkle cookies, cream cheese swirl or white chips visible |
| **White Chocolate Macadamia Nut Cookies** | Special | Golden cookies, chunky with visible macadamia pieces and white choc chips |
| **French Macarons** | Super Special | A small tower of pastel macarons — unmistakably fancy. Should feel like the jackpot |
| **Chocolate Truffle Brownies** | Super Special | Dense, glossy, stacked brownie slices with visible truffle ganache. Rich and indulgent |

Visual distinction between Special and Super Special should be legible at trail-thumbnail size — consider a subtle glow, a star badge, or a richer background treatment on the Super Special cards.

---

### Card back — 1 asset

**Already generated.** Used for the face-down deck badge (~56×76px) and any flip animation.

---

### Shared card frame

All card types share the same frame/border treatment for consistency. Suggested elements (final design TBD):
- Rounded corners (~16px radius at full size)
- A warm, slightly textured card background (cream/off-white — not stark white)
- Card type indicated by a top strip colour: warm amber for Cookie Cards, a distinct colour per family member for Caught! cards, gold/purple for Treats
- The numeric value (Cookie Cards) or family member name (Caught! cards) rendered in a legible font at the bottom of the full-reveal card

---

### Other game UI assets (non-card)

| Asset | Approx size | Notes |
|---|---|---|
| Cookie Crumbs counter | Icon ~32×32px + text | Moved v5 from the header into the Controls-area private strip alongside the player's own totals (see §14) — crumb pile icon with a running count. **Needs a dimmed/locked variant** for the Sylly Mode scare-off rule. |
| Family member warning strip | ~40×40px per slot, ×5 | Persistent header strip (§14/§15). **Single state per slot as of v5** — seen-this-Raid only; the per-match copies-remaining count moved to the Cookie Trail overlay, freeing header space for the mandatory `[?]`/🔊/✕ chrome. **Plus a distinct High Alert treatment** (highlighted slot, no separate pip asset needed). |
| Cookie Trail copies-remaining display | Small pip row or count, per family member | New home for the per-match state the warning strip used to carry (see above) — rendered inside the Cookie Trail overlay, not the header. |
| Take button | Full-width, ~56px tall | The primary action — should feel big and satisfying to tap |
| Sneak Out button | Full-width, ~56px tall | Base game. Visually distinct from Take (different colour/weight) but same physical size |
| Play Innocent button | Full-width, ~56px tall | Sylly Mode, replaces Sneak Out |
| Dob button | Full-width, ~56px tall | Sylly Mode third action. **Standard suite button, text only — no bespoke art required.** |
| Decision timer bar | Full-width, ~4px tall | Thin progress bar above the action buttons, 15s |
| Waiting-state name chips | Text chips | Fill in as each player locks their choice. **Text only, no art required.** |
| Reveal delta chip | Text chip | `+3` / `−2` next to each player name at reveal. **Gated by Open Book (v5):** shown exactly for every player when On; shown exactly for the viewing player only when Off, with other players' outcomes rendered as flavour-line text instead (see §7, §14). |
| Affinity display (Sylly Mode) | Two text lines | `⭐ Favourite: Mum` / `👁 Watcher: Dad`, own device only. **Text only, no art required.** |
| Crumb Debt chip (Sylly Mode) | Text chip | `owes 2 🍪` next to that player's count |
| Cookie Stash summary (private strip) | ~full width | The player's own running total — large number, simple layout |
| BUSTED! reveal animation frame | Full screen | The dramatic bust moment — see §16 for sound notes. Base game only. |
| Trail thumbnail strip | ~48×66px each, horizontal scroll | Beneath the hero card, newest right, auto-scrolled to end |

---

## 23. Palette Note — resolved at the v5 design review

**Both concerns this section originally flagged were confirmed real, not hypothetical, and both are now resolved by the §1 decision to decouple brand chrome from card art:**

1. **Cross-game collision — confirmed, not just "worth checking."** The v4 plan's proposed brand (`amber-800`/caramel-brown territory) is Pecking Order's *exact* shipped brand: `#854D0E`, with cream card grounds (`#FDF8EE`) and a gold accent (`#C9A227`) — the same three ingredients (warm brown + cream + gold) this brief's original plan called for. This was found by checking the actual `styles.css` file, not the colour-family list in `ui-style.md`'s reference table, which is what let it through the v4 review.
2. **Warm-on-warm legibility — resolved as a side effect, not by reserving a colour.** Rather than carving out one cool accent color for danger states inside an otherwise all-warm palette, cjar's brand chrome (CTAs, pills, toggles, slider, settings tint, modal borders) now takes its own distinct hue — direction confirmed as honey-gold, pushed warmer/deeper than FRT's lemon-yellow, exact hex pending the BLD/FRT recolour phase (§1). **The warning strip's dim/lit/danger states still need their own high-contrast treatment independent of the brand hue** — that requirement doesn't go away just because the brand chrome moved; it's a separate, smaller decision for the tech spec (e.g. the danger/BUSTED! state can use a genuinely different colour from the brand entirely, the way LTTP's red states differ from its red-500 brand).

**Card art stays cream-and-brown, unaffected by this change** — protecting any art already generated. The brand hex should still follow the art's actual warmth once both exist, per the original instruction in this section; that instruction survives the resolution, it's just now aimed at chrome instead of at everything on screen.
