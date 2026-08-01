# New Game Brief — Cookie Jar
**Document type:** Phase 1 — Design Brief (non-technical)
**Abbreviation:** `cjar` *(proposed — not confirmed, see Open Questions)*
**Status:** Draft v4 — Core 1:1 clone mechanics unchanged from v1. **v4 resolves the terminology split with the companion doc and closes the mechanical and UI gaps found in a design review pass: "Operation" retired in favour of Cookie Raid; Reach → Take; Sneak Out kept for the base game but Sylly Mode's stay-put action renamed Play Innocent; unclaimed-Treat rule completed; Snack Friendly and Kitchen Rules both hidden in Sylly Mode; Quick Snack treat schedule fixed; a decision timer added; screens 4–6 collapsed; warning strip, reveal, waiting state and end-screen grid respecified.** See `cookie-jar-sylly-mode-draft.md` v2 for the matching Sylly Mode changes.

**This is a Phase 1 design document, not a specification.** It was written without access to the codebase, the existing component library, `ui-style.md`, or the other 16 games' implementations. Every decision in it is therefore **soft-locked**: agreed as a direction, expected to be re-examined at technical spec by whoever holds full project context. Nothing here should override something that turns out to be true about the actual suite. See §0.1 for which parts are which.

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
| **Brand colour preference** | **Warm amber/golden-brown — resolved.** Full palette check complete against `ui-style.md`. Taken: pink (LI5), purple (GM), teal (SS), amber (JEC), orange (YGI), red (LTTP), lime (NAT), cyan (DSD), sage (GTH), yellow/`#d97706` (BLD/PKO), ocean-blue (DYB), zinc (PASS), emerald (NT), banana-yellow (FRT), indigo (SHP). Free and distinct: a warm **caramel/cookie-brown** (e.g. `#92400e` / `amber-800` territory — darker and more brown than BLD's `#d97706` yellow). **[SOFT]** Needs a specific hex confirmed at technical spec against the real palette file; the colour space looks clear from here but this was checked from a list, not from the running suite. CSS class will be `game-toggle-on-cjar` + `cjar-range` per suite convention. **See §23 for the full palette note flagged at design review.** |

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

1. At the start of the Raid, the full deck for this Raid is shuffled (see §10 for exactly what's in it — Cookie Cards, remaining Caught! cards, and this Raid's Treat plus any Treats still unrevealed from earlier Raids).
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
| **Roughly how long should a full game take?** | `[ASSUMPTION: 10–15 minutes for Full Feast, shorter for Quick Snack]` |

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

**Snack Friendly — option detail:**
- **Off:** pure original odds — card 1 of a Raid could be a Caught! card, same as the source game.
- **Safe First Grab:** card 1 of every Raid is guaranteed to be a **Cookie Card** specifically.
- **Warm-Up:** cards 1 *and* 2 of every Raid are guaranteed to be **Cookie Cards**.

*(v3 said "guaranteed not to be a Caught! card (forces a Cookie or Treat card)". Allowing a Treat into that slot creates a free jackpot: a solo Sneak Out on flip 1 banks 5–10 points having risked and collected nothing. Forcing a Cookie Card closes it.)*

**Kitchen Rules — option detail:**
- **Standard Burn (default, matches source game exactly):** on a BUST, the family member's 2nd/triggering card is permanently removed from the deck for the rest of the match — that family member gets marginally safer in later Raids. **Note: one copy of three is removed, so that family member is still in play and can still bust a later Raid.**
- **On Guard:** no card is ever removed on a BUST — full hazard density persists across every Raid. `[Note: this is the harder setting, not a gentler one, despite the earlier working name "Endless Pantry" implying cosiness — renamed to avoid that mismatch.]`
- **High Alert Mode:** Standard Burn happens *and* a 4th copy of a random family member is added to the deck for the next Raid, with an on-screen announcement (e.g., "Dad is on High Alert!"). Escalating danger, digital-native twist not possible in the physical original. **This family member needs its own state on the warning strip — see §14.**

**Are there any settings that should be locked or hidden in certain situations?**
Yes. **In Sylly Mode (Dibber Dobber), both Snack Friendly and Kitchen Rules are hidden/disabled entirely.** All of Kitchen Rules' options govern what happens on a bust, and all of Snack Friendly's options exist to prevent an early bust — Sylly Mode has no bust, so neither has anything to act on. Match Length stays visible and functional. *(v3 hid Kitchen Rules only; Snack Friendly was overlooked.)*

**Do any settings scale automatically with player count rather than being user-facing?**
No. `[Cookie Assortment / deck rebalancing by player count was considered and explicitly deferred — see §19. Not a setting in this draft.]`

---

## 8. Sylly Mode

**Thematic name:** Dibber Dobber *(naming flagged as reversible — see Open Questions)*

**In one sentence:** every card flip becomes a three-way choice — Take, Play Innocent, or Dob — where Take stays the highest-ceiling path to winning, Play Innocent is the safe fallback, and Dob disrupts other players rather than banking a personal fortune.

**Full design, balance-testing history, and decision log:** `cookie-jar-sylly-mode-draft.md` v2 (companion document). Summary below.

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
- **Deck:** the 15 Cookie + 15 Caught! pool is cut randomly in half (15 cards), **then that Raid's Treat is added** and shuffled — a 16-card deck. The Treat is added after the cut so it's always in play. *(v3 put the Treat in the pool before the cut, giving it a ~50% chance of never being dealt — roughly half the Treats and half the Treat art would go unseen across a match.)*

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
| **Is there any information that must stay private to one player or one team's device?** | Yes — each player's Cookie Stash (banked total across previous Cookie Raids) is private. Their in-progress, not-yet-banked Raid total is also private until they Sneak Out or it busts. In Sylly Mode, their Favourite and Watcher are private to them. |
| **Are there moments where players act simultaneously?** | Yes — every single choice, every Cookie Raid, is simultaneous. There is no sequential turn order. |
| **Are there moments where one device should be locked while another is active?** | No — there's no "active player" concept. Everyone is either deciding or waiting for others to finish deciding. |
| **When it's not a player's turn, what do they see, and can they interact with anything, or is it read-only?** | Not applicable in the usual sense. A player who has already Sneaked Out this Cookie Raid watches the rest play out (read-only) until the Raid ends. In Sylly Mode nobody is ever read-only, since nobody leaves. |
| **Any roles or phases that simply don't work with multiple devices?** | None — this game is arguably a *better* fit for individual devices than the physical original. |
| **Do any settings or events temporarily hide information that's normally visible?** | No — Dibber Dobber (§8) changes outcomes and adds a third action, but doesn't hide anything that's normally visible. |

**Every device renders the same screen.** There is no host/TV screen. What differs per device is a private strip: that player's own Cookie Stash, their in-progress Raid total, and (in Sylly Mode) their Favourite and Watcher. Everything else — the deck, the last card, the Crumb pile, the warning strip, the reveal — is identical on all devices.

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

**[SOFT — this entire section]** Everything below is a starting point reasoned from a generic ~390px mobile portrait viewport and standard suite conventions. The pixel values, the zone arithmetic, and the layout choices should all be re-derived against the real component library and the other games' screens. What's worth carrying forward is the *list of things the screen has to do* — the states, the two-part warning strip, the per-player deltas, the locked-crumbs state — not the numbers attached to them.

**The main game screen (screen 4)** is the one screen worth speccing in plain English before the technical spec, since it's the persistent view every device shows for the whole Cookie Raid.

**Three-zone layout (Header / Stage / Controls — suite standard):**

```
┌────────────────────────────────┐
│ HEADER                         │
│ Raid 2 of 5      🍪 Crumbs: 4  │
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
│ YOUR STASH: 12  ·  THIS RAID: 3│
│ ⭐ Mum   👁 Dad     (Sylly only)│
└────────────────────────────────┘
```

**Stage area — resolving the v3 conflict. [SOFT — all dimensions]** v3's §14 showed the face-down deck and the last card side by side while §22 specced the reveal card at 280×380px. Two 280px-wide cards cannot sit side by side on a ~390px viewport. Resolution:

- **The last card is the hero** — centred, ~240×330px
- **The face-down deck is a small stacked badge**, ~56×76px, offset to the right of the card, showing the remaining count. It's a counter, not a second card.
- **The revealed-card trail sits beneath as a horizontally scrolling strip** of ~48×66px thumbnails, newest on the right, auto-scrolled to the end. Tapping any thumbnail — or the last card — opens the full Cookie Trail overlay. *(v3's §22 asked for a path strip that v3's §14 didn't include. It's kept: in the source game the visible path is important public information for judging bust risk, and burying it entirely behind a tap makes the game harder to read. Horizontal scroll is used here specifically because vertical space is the scarce resource; it is not used anywhere else in this game.)*

**Cookie Trail:** the full scrollable log of every flip this Raid — card revealed, actions chosen, and cookies gained/lost per player. Suite-standard slide-up overlay (same pattern as How to Play and Settings). Opened by tapping the last card or any trail thumbnail.

**Controls area — four states:**

- **Deciding:** two full-width buttons in the base game (Take, Sneak Out); three in Sylly Mode (Take, Play Innocent, Dob), one per row per suite button rules. A decision timer runs as a thin progress bar above the buttons — **[SOFT] 15 seconds as a starting value; tune against how long a real table actually takes.** **On timeout: base game auto-resolves to Sneak Out; Sylly Mode auto-resolves to Play Innocent** — the safe option in each mode. *(Without a timer, one slow player stalls everyone on every flip, 15+ times per Raid.)*
- **Waiting:** this player has chosen; buttons lock into a chosen/confirmed state. **Player name chips fill in as each person locks in — showing only *that* they've chosen, never *what*.** No blocking modal; the rest of the screen stays live and readable.
- **Revealing:** buttons dissolve and player names populate into the zone matching their choice — **each name carrying its own delta chip** (`Ava +3`, `Ben −2`, `Cal 0`). *(v3 showed only who went where. The amount is the interesting part, and in Sylly Mode a single flip can contain a steal, a split and a scare-off at once — names alone can't communicate that.)*
- **Private strip (bottom, own device only):** your Cookie Stash, your in-progress Raid total, and in Sylly Mode your Favourite and Watcher as two short text lines. Crumb Debt, if any, shows here as a small "owes 2 🍪" chip.

**Header — family warning strip.** A persistent row of 5 slots, one per family member. Each slot carries **two independent pieces of state**:

1. **Seen this Raid** (per-Raid) — dim = not yet appeared, lit = appeared once, danger = the next one busts
2. **Copies remaining in the match** (per-match) — three small pips beneath the icon, dimming as copies burn

*(v3 specced a third state, "removed = busted and removed from play". That's wrong and actively misleading: a bust removes one copy of three, so that family member is still in the deck and can still bust a later Raid. A player reading "removed" would take a Take they shouldn't. The pip row replaces it, and it also cleanly expresses On Guard, where no copy is ever removed.)*

**High Alert state:** when Kitchen Rules is set to High Alert and a family member gets a 4th copy added, that slot needs its own visual treatment — a highlighted/outlined slot and a 4th pip, plus the on-screen announcement ("Dad is on High Alert!"). This is a genuinely different state from both "seen once" and "copies burnt", and the three-state model in v3 had nowhere to put it.

**Crumbs — locked state.** In Sylly Mode, when a Dobber is present the Crumb pile is visible but unclaimable that flip (the scare-off rule). The Crumbs counter needs a distinct dimmed/locked visual plus a short label, or players will read a working rule as a bug.

**Cookie animation:** a small, reusable cookie-counter increment/decrement animation — plays whenever a player's cookie count changes (gain from a Take, loss from a Family card, Crumb pickup, Dob backfire). Same animation primitive reused across all triggers, different direction (up = gain, down = loss). **It must be per-player-row, not a single global counter** — in Sylly Mode one flip produces simultaneous gains and losses across different players. This is the one lightweight animation worth building from day one since it applies to nearly every state change in the game.

**Accessibility note:** Take / Sneak Out / Play Innocent / Dob must be distinguishable by icon and shape, not colour alone.

---

## 15. Rule Reference / In-Game Cheat Sheet

The family-member warning strip (§14 header) handles the most important in-game reference need — tracking which Caught! types have appeared this Raid and how many copies are left — passively and always-visibly, without needing a separate overlay. The Treat tier reference (5pts vs 10pts) is simple enough to absorb from the How to Play card rather than an in-game lookup.

| Field | Answer |
|-------|--------|
| **What reference material do players need mid-game?** | Which Caught! types have already appeared once this Raid, and how many copies of each remain in the match — handled by the persistent warning strip in the Header (§14), always visible, no tap required |
| **How do they access it?** | Always visible — passive strip in the Header zone. No separate lookup or overlay needed. |
| **Does opening it interrupt the game, or is it a non-blocking overlay?** | Non-blocking — it's always present, never opened or closed |
| **Is it a static image/asset, or does it need to render dynamically from data?** | Dynamic — reflects both per-Raid appearances and per-match copy counts in real time |
| **Does it need a per-skin version if §11 has custom visual assets?** | Only insofar as it uses the same family-member icon assets used elsewhere on the card faces |

---

## 16. Sound Design

`[ASSUMPTION: tone is playful and cheeky, not tense — kids' game, not a heist thriller.]`

| Moment | Sound direction |
|---|---|
| Cookie Card revealed | Light, cheerful chime |
| Cookie split among players | Soft multiple "plink" sounds, one per share |
| Caught! card revealed (1st of its type) | A brief "uh oh" sting — a door creak or a gasp, not alarming |
| Caught! card revealed (2nd — BUSTED!) | A comedic "busted" sound — a slammed door or a scolding "Ah-ah-ah!" |
| Choices reveal | A quick drumroll-to-reveal sting |
| Lone player Sneaks Out (jackpot) | A triumphant, slightly cheeky "score" jingle |
| Treat collected | An extra-sweet chime, distinct from the regular cookie sound — bigger chime for Super Special Treats |
| Cookie Raid busts, cookies lost | A deflating "aww" sound — comedic, not harsh |
| High Alert Mode triggers (if enabled) | A dramatic "on alert" sting with the family member's name |
| Decision timer final 3 seconds | A soft tick — audible but not stressful |
| Dob backfires (Sylly Mode) | A comedic slide-whistle/deflate — the accusation flopping |
| End of match | A warm, celebratory jingle |

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
- **Dibber Dobber deck variance** — a genuinely random half-cut of the Cookie/Family pool is kept as-is. Simulation shows the "12 Family / 3 Cookie" nightmare scenario has only a 0.14% chance of occurring, and even a 30/70 split only happens 2.7% of the time. Deliberately engineering more variance was considered and shelved.
- **Starting stash → 5 cookies** (tested vs 3 — starting at 3 increased first-3-flip wipeout probability from 5.2% to 21.3%). Flagged for tuning if playtesting shows players feel insufficiently pressured.
- The cookie-card-burn Kitchen Rules alternative — not used; Dibber Dobber took a different direction.

**Still genuinely open:**
- Exact brand colour hex within the amber-800/cookie-brown space (§1, §23)
- Whether "Dibber Dobber"/"Dob" should be swapped for globally legible equivalents (recommendation: keep — see Open Questions)
- Whether to actively discourage 3-player games given the source material's "weaker at 3" criticism
- Default v1 art treatment — emoji/CSS-first vs. a bigger illustrated budget
- Simulation re-runs for the three unsimulated v4 changes: Treat priority, Crumb Debt, guaranteed Treat deck-entry

**Things flagged from earlier design discussion, explicitly OUT OF SCOPE for this draft:**
- The "damp squib" fix beyond Snack Friendly — largely superseded by Snack Friendly now existing as a real setting, but note Snack Friendly is opt-out (Off exists), so the underlying weak point is still reachable if a player chooses Off.
- PWA-native presentation enhancements: shaking-jar/crumbs visual hinting at a private stash, a public "Greed History Log" showing attempts without outcomes.
- An optional visible running score for younger players who can't track hidden stashes — worth revisiting after playtesting, since 10–15 minutes with no visible score may read as flat to kids even though it's the source game's design.

**Things that might be complicated to implement (flag for Claude Code):**
- Simultaneous reveal logic with no turn order at all is a different multiplayer shape from most of the suite's existing games.
- The Caught! card removal rule (persistent across the match, with 3 different behaviours depending on Kitchen Rules) needs careful state tracking — and the warning strip now surfaces per-Raid and per-match state in the same component.
- Kitchen Rules' High Alert Mode requires tracking a *dynamically added* card (the extra family member copy) that didn't exist in the fixed 15+15+5 base deck — it breaks the "fixed deck" assumption used elsewhere in this brief.
- The 15-second timer needs a server-authoritative resolution so a disconnected or backgrounded device can't stall or desync a flip.
- Crumb Debt is a per-player, per-Raid ledger that interacts with every gain path — small, but easy to get wrong.

---

## Open Questions

1. [NON-BLOCKER] Exact brand colour hex in the amber-800/cookie-brown space — colour space is confirmed clear, specific hex TBD at technical spec.
2. [NON-BLOCKER] **"Dibber Dobber" / "Dob" naming.** Australian/British slang that won't parse for US or international players on first read. **Recommendation: keep it.** "Point" collides with *points* (the Treat scoring currency), the reveal copy already carries the meaning without a glossary, and a Sylly Mode is the right place for regional charm. If a global-legibility swap is ever wanted, **"Tattle" / mode "Tattletale"** is a clean one-for-one replacement — a single find-replace across both documents.
3. [NON-BLOCKER] Whether to actively discourage 3-player games in copy.
4. [NON-BLOCKER] Default v1 art treatment — emoji/CSS-first vs bigger illustrated budget (see §22 for dimensions regardless of treatment).
5. [NON-BLOCKER] Whether Cookie Assortment (deck scaling by player count) needs a real setting after 6–8 player playtesting.
6. [NON-BLOCKER] Starting stash of 5 cookies — confirmed as the day-one default, flagged for tuning after playtesting.
7. [NON-BLOCKER] Simulation confirmation for the three reasoned-but-untested v4 changes (Treat priority, Crumb Debt cap and clear behaviour, guaranteed Treat deck-entry).

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
4. **Card revealed: Caught! card — Mum (again).** Second Mum this Raid — **BUSTED!** Ben and Dana, still in, lose everything they'd collected this Raid (1 cookie each from step 3). One copy of Mum is removed from the game for the rest of the match (under Standard Burn — under On Guard it would stay in play). Mum's warning-strip pips drop from 3 to 2.

**Result:** Ava banks 3 cookies to her Cookie Stash, Cal banks 3, Ben and Dana bank 0. Neither Treat was revealed this Raid — both carry forward into Cookie Raid 4's deck, alongside Raid 4's French Macarons.

---

**A moment from a single player's point of view (private information):**
During step 3, from **Ben's** device: he sees the same table state everyone sees (5 cookies just split, 2 Cookie Crumbs, Mum lit on the warning strip with 3 pips) — but he has no visibility into what Ava's Cookie Stash looks like after leaving in step 1, or what Cal is about to choose this turn. He only sees his own running total and the shared public state. When Cal's choice reveals as Sneak Out, Ben learns *that* Cal left and exactly what he took (shown as a delta chip, public), but Ava's and Cal's full match totals remain private until the end screen.

---

## 22. Asset Spec (Rough — Pre-Screen Design)

This section gives enough dimensional guidance for art to begin in parallel before screens are fully designed. All dimensions are estimates based on standard mobile-first PWA conventions for the suite and will be confirmed/adjusted at technical spec stage.

**[SOFT — all dimensions in this section.]** These were derived from a generic ~390px viewport, not from the real screens. Treat the *asset list* as the useful output — how many pieces of art are needed, and what each has to communicate — and re-derive the sizes.

**General assumptions:**
- Primary target is mobile portrait, ~390px wide (iPhone-class viewport)
- Cards are the central visual element, but **vertical space is the binding constraint** — see the sizing note below
- Three distinct card types: Cookie Cards, Caught! cards, Treat cards, plus one card back
- All card types share the same physical card dimensions for consistency

---

### Card dimensions — revised

| Use | Approx size **[all SOFT]** | Notes |
|---|---|---|
| **Full reveal card** (centre of Stage) | **~240 × 330px** | Reduced from v3's 280×380. On a ~390×680 usable viewport, the header (~90px), trail strip (~70px) and three-button Sylly Mode controls (~190px) leave roughly 330px for the Stage. 240×330 fits with breathing room; 280×380 does not. |
| **Face-down deck badge** | **~56 × 76px** | A small stacked-card badge with a remaining-count number, offset right of the hero card. Not a second full-size card. |
| **Trail thumbnail** (previously revealed cards) | **~48 × 66px** | Horizontally scrolling strip beneath the hero card. Family member face or cookie tier icon must read clearly at this size. |
| **Treat on counter** (uncollected treat displayed) | ~100 × 136px | Slightly larger than the trail thumbnail since it's an active, collectible item players are eyeing |

*(Claude Code should treat these as a starting point and finalise against the real component heights — the constraint to respect is that three stacked action buttons plus header plus trail strip must all fit without scroll.)*

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
| Cookie Crumbs counter | Icon ~32×32px + text | Persistent header element — crumb pile icon with a running count. **Needs a dimmed/locked variant** for the Sylly Mode scare-off rule. |
| Family member warning strip | ~40×40px per slot, ×5, plus 3 copy pips beneath each | Persistent header strip (§14/§15). Two independent states per slot: seen-this-Raid, and copies-remaining. **Plus a distinct High Alert treatment** (highlighted slot + 4th pip). |
| Take button | Full-width, ~56px tall | The primary action — should feel big and satisfying to tap |
| Sneak Out button | Full-width, ~56px tall | Base game. Visually distinct from Take (different colour/weight) but same physical size |
| Play Innocent button | Full-width, ~56px tall | Sylly Mode, replaces Sneak Out |
| Dob button | Full-width, ~56px tall | Sylly Mode third action. **Standard suite button, text only — no bespoke art required.** |
| Decision timer bar | Full-width, ~4px tall | Thin progress bar above the action buttons, 15s |
| Waiting-state name chips | Text chips | Fill in as each player locks their choice. **Text only, no art required.** |
| Reveal delta chip | Text chip | `+3` / `−2` next to each player name at reveal |
| Affinity display (Sylly Mode) | Two text lines | `⭐ Favourite: Mum` / `👁 Watcher: Dad`, own device only. **Text only, no art required.** |
| Crumb Debt chip (Sylly Mode) | Text chip | `owes 2 🍪` next to that player's count |
| Cookie Stash summary (private strip) | ~full width | The player's own running total — large number, simple layout |
| BUSTED! reveal animation frame | Full screen | The dramatic bust moment — see §16 for sound notes. Base game only. |
| Trail thumbnail strip | ~48×66px each, horizontal scroll | Beneath the hero card, newest right, auto-scrolled to end |

---

## 23. Palette Note [SOFT] (flagged at design review — for Claude Code's cross-game check)

The current colour plan asks a lot of one warm hue range: brand caramel/cookie-brown (`amber-800` territory), cream card backgrounds, a distinct colour per family member on the Caught! card top strips, and gold/purple for Treats. Two things worth checking when the hex is finalised:

1. **Warm-on-warm legibility.** The warning strip's dim/lit/danger states and the Crumbs locked/unlocked states all need to read at a glance. If everything on screen is a warm brown or amber, those state changes have very little contrast to work with. **Suggestion: reserve one cool, high-contrast accent used exclusively for danger states** — BUSTED!, the second-appearance warning slot, and the Watcher indicator. Nothing else should use it, so it always means "danger" without a legend.
2. **Cross-game collision.** `#92400e` sits near BLD/PKO's `#d97706`; worth confirming against the full palette in `ui-style.md` at the hex level rather than the colour-family level.

Art already generated should factor into this decision — if the existing card art has locked in a particular warmth or accent, the brand hex should follow the art rather than the other way around.
