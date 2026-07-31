# New Game Brief — Cookie Jar
**Document type:** Phase 1 — Design Brief (non-technical)
**Abbreviation:** `cjar` *(proposed — not confirmed, see Open Questions)*
**Status:** Draft v3 — Core 1:1 clone mechanics unchanged from v1. Terminology, settings, and card content locked from the creative review session (family archetypes, treat hierarchy, cookie visual tiers, Snack Friendly, Kitchen Rules). Sylly Mode (Dibber Dobber) now fully designed and finalised — see §8, and the companion doc `cookie-jar-sylly-mode-draft.md` for full mechanics and balance-testing history.

---

## 1. Identity

| Field | Answer |
|-------|--------|
| **Full game name** | Cookie Jar |
| **Short nickname / abbreviation** | `cjar` — checked against all 15 active plugin prefixes (`li5`, `gm`, `ss`, `jec`, `ygi`, `lttp`, `nat`, `dsd`, `gth`, `dyb`, `bld`, `pass`, `nt`, `frt`, `shp`) and the 16th in-progress game (`flw`). No collision. Safe to use. |
| **One-sentence tagline** | Who took the cookies from the cookie jar? |
| **Thematic universe** | The "Who Took the Cookie from the Cookie Jar" nursery rhyme/chant, reframed as a kid's secret kitchen mission — sneaking past family members to raid the jar before dinner. Playful and cheeky, not tense or high-stakes. |
| **Emoji / icon** | 🍪 |
| **Brand colour preference** | **Warm amber/golden-brown — resolved.** Full palette check complete against `ui-style.md`. Taken: pink (LI5), purple (GM), teal (SS), amber (JEC), orange (YGI), red (LTTP), lime (NAT), cyan (DSD), sage (GTH), yellow/`#d97706` (BLD/PKO), ocean-blue (DYB), zinc (PASS), emerald (NT), banana-yellow (FRT), indigo (SHP). Free and distinct: a warm **caramel/cookie-brown** (e.g. `#92400e` / `amber-800` territory — darker and more brown than BLD's `#d97706` yellow). Needs a specific hex confirmed at technical spec, but the colour space is clear. CSS class will be `game-toggle-on-cjar` + `cjar-range` per suite convention. |

---

## 2. The Players

| Field | Answer |
|-------|--------|
| **Player count range** | 3–8 (matches suite constraint and the source game's supported range) |
| **Teams or individuals?** | Individuals — every player for themselves |
| **Are there different roles?** | No — all players do the same thing every Operation |
| **Is any information hidden from some players?** | Yes — each player's own Cookie Stash (their private banked total) is hidden from everyone else. The in-progress Operation state (revealed cards, the Cookie Crumbs pile) is public to everyone still in that Operation. |
| **Minimum meaningful player count** | *[ASSUMPTION: 4]* — research into the source game consistently flags 3 players as noticeably weaker than 4+, because the "does anyone else stay?" tension needs enough bodies for the split mechanic to matter. Still open whether to actively discourage 3-player games in copy. |

No distinct roles. All players are equally trying to build the biggest Cookie Stash across the match.

---

## 3. The Core Loop

**In one sentence — what does a player DO on their turn?**
Every time a new card is revealed, privately and simultaneously choose **Reach** (stay for the next card) or **Sneak** (bank what you've collected this Cookie Raid and leave).

**What is the central tension or fun moment?**
The simultaneous reveal — watching everyone's Reach / Sneak choice flip over at once, especially the moment someone realises they're the *only* one still reaching in (jackpot) or the only one still in when the second matching Caught! card turns up (BUSTED!).

**What type of game is this closest to?**
☐ Word association / description
☐ Deduction / bluffing / social deception
☐ Trivia / knowledge
☐ Climbing / shedding / adjacency-based card game
☑ Something else: **Push-your-luck, simultaneous hidden-choice** (Incan Gold/Diamant family) — none of the suite's existing genre buckets quite cover this.

**Walk through one complete Cookie Raid (round) step by step, in plain English:**

1. At the start of the Operation, the full deck for this Operation is shuffled (see §10 for exactly what's in it — Cookie Cards, remaining Caught! cards, and any Treats accumulated so far).
2. The top card is revealed to everyone still in the kitchen this Operation.
   - **Cookie Card:** the cookie count on the card is split evenly (rounded down) among every player still in. Any leftover that can't be evenly split stays visible on the counter as Cookie Crumbs, growing the shared pile for whoever leaves next.
   - **Caught! card (a family member):** if no card of that same family member has been revealed yet *this Operation*, nothing happens — just a scare (with a flavour line, see §10). If it's the **second** card of that same family member revealed this Operation, it's **BUSTED!** — skip to step 5.
   - **Treat card:** placed visibly on the counter, uncollected, until someone leaves the Operation alone (see step 4). If the Treat was never reached/revealed this Operation (it was shuffled in but the deck ran out), it simply carries forward in the deck naturally — same value, same identity.
3. If the Cookie Raid didn't just bust, every player still in privately and simultaneously chooses **Reach** or **Sneak** on their own device.
4. All choices are revealed at once.
   - Players who chose **Sneak** bank the cookies they've already collected this Cookie Raid, and split evenly (rounded down) any Cookie Crumbs currently on the counter with the other players leaving this same turn. If exactly **one** player Sneaks alone, they take *all* the Cookie Crumbs, plus any Treat currently on the counter.
   - Players who chose **Reach** go back to step 2 for the next card — as long as at least one player is still in.
5. If it busted: every player still in loses all the cookies they collected *this Cookie Raid only* — cookies already safely in their Cookie Stash from previous Raids are untouched. Any Treat that was already **revealed and sitting on the counter** is **permanently discarded** — lost forever. Any Treat that was shuffled into the deck but not yet revealed simply remains in the deck for the next Cookie Raid. One copy of that family member is permanently removed from the game for the rest of the match (subject to the Kitchen Rules setting — see §7).
6. The Cookie Raid ends — either because it busted, or because everyone remaining has left. Repeat from step 1 for the next Cookie Raid, for as many Raids as the Match Length setting specifies (default: 5).

**Is there anything players do simultaneously, or is everything sequential?**
The Reach / Sneak choice each turn is simultaneous and hidden until reveal. There's no sequential turn order at all — everyone decides at once, every time.

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
| **Are ties possible, and if so how are they handled?** | If tied on total value, most Treats collected wins the tie. `[CLARIFICATION NEEDED: if still tied — source game just says "play again," which doesn't map cleanly to a digital end screen. Working assumption: shared win, consistent with Pecking Order's precedent — needs confirming.]` |
| **Roughly how long should a full game take?** | `[ASSUMPTION: 10–15 minutes for Full Feast, shorter for Quick Snack]` |

---

## 6. Scoring

| What happened | Who gets points | Roughly how many | Notes |
|--------------|----------------|-----------------|-------|
| Cookie Card revealed and split | Every player still in | Card value ÷ number still in, rounded down | Leftover becomes Cookie Crumbs |
| Player Sneaks Out alone | That player only | All Cookie Crumbs on the counter + any Treat there | The "jackpot" outcome |
| Operation busts (2nd matching Caught! card) | Nobody | 0 — everyone still in loses that Operation's cookies | Cookie Stash from earlier Operations is safe |
| Special Treat collected (Strawberry Shortbread, Red Velvet, White Choc Macadamia) | The player who collected it | 5 bonus points | These enter the deck in Operations 1–3 |
| Super Special Treat collected (French Macarons, Chocolate Truffle Brownies) | The player who collected it | 10 bonus points | These enter the deck in Operations 4–5 |
| Operation ends with nobody ever having collected anything (a "dead" Operation) | Nobody | 0 | Known, inherited weak point — see §19 |

**Treat value is fixed to treat identity, not collection order.** A treat's point value (5 or 10) is a permanent property of that specific treat — Macarons are always worth 10, Strawberry Shortbread is always worth 5, regardless of when they're collected. This is a deliberate deviation from the source game (which ties value to collection order), chosen because it's simpler to teach and the fixed-order deck entry (Op 1→Strawberry Shortbread, Op 2→Red Velvet, Op 3→White Choc Mac, Op 4→Macarons, Op 5→Brownie) makes "later Operations have bigger treats" a learnable pattern rather than a tracking exercise.

**Does scoring feel balanced?**
Inherited weak point from the source game: research found **roughly 2 of every 5 rounds can end with two matching hazards revealed before anyone banks a single point** — a "dead" Cookie Raid. Snack Friendly (§7) is the digital-native mitigation for this, on by default.

**Any outcomes where nobody scores?**
Yes — a busted Operation where nobody had banked anything yet, and any Operation where every player Sneaks Out on the very first card before any cookies are split.

---

## 7. Settings

| Setting (display) | Options | Default | Internal variable | Internal values |
|------------------|---------|---------|------------------|-----------------|
| Snack Friendly | Off / Safe First Grab / Warm-Up | Safe First Grab | `cjarSnackFriendly` | `'off'` / `'safe'` / `'warmup'` |
| Kitchen Rules | Standard Burn / On Guard / High Alert | Standard Burn | `cjarKitchenRules` | `'burn'` / `'on-guard'` / `'high-alert'` |
| Match Length | Quick Snack (3) / Full Feast (5) | Full Feast | `cjarMatchLength` | `3` / `5` |

**Snack Friendly — option detail:**
- **Off:** pure original odds — card 1 of an Operation could be a Caught! card, same as the source game.
- **Safe First Grab:** card 1 of every Operation is guaranteed not to be a Caught! card (forces a Cookie or Treat card to open things).
- **Warm-Up:** cards 1 *and* 2 of every Operation are guaranteed not to be Caught! cards.

**Kitchen Rules — option detail:**
- **Standard Burn (default, matches source game exactly):** on a BUST, the family member's 2nd/triggering card is permanently removed from the deck for the rest of the match — that family member gets marginally safer in later Operations.
- **On Guard:** no card is ever removed on a BUST — full hazard density persists across every Operation. `[Note: this is the harder setting, not a gentler one, despite the earlier working name "Endless Pantry" implying cosiness — renamed to avoid that mismatch.]`
- **High Alert Mode:** Standard Burn happens *and* a 4th copy of a random family member is added to the deck for the next Operation, with an on-screen announcement (e.g., "Dad is on High Alert!"). Escalating danger, digital-native twist not possible in the physical original.

**Are there any settings that should be locked or hidden in certain situations?**
None identified yet.

**Do any settings scale automatically with player count rather than being user-facing?**
No. `[Cookie Assortment / deck rebalancing by player count was considered and explicitly deferred — see §19. Not a setting in this draft.]`

---

## 8. Sylly Mode

**Thematic name:** Dibber Dobber

**In one sentence:** every card flip becomes a three-way choice — Reach In, Sneak Out, or Dob — where Reach stays the highest-ceiling path to winning, Sneak is the safe fallback, and Dob disrupts other players rather than banking a personal fortune.

**Full design, balance-testing history, and decision log:** `cookie-jar-sylly-mode-draft.md` (companion document). Summary below.

### Core change

Adds a third action, **Dob**, alongside Reach In and Sneak Out. All three are chosen simultaneously and privately every card flip, same as the base game's Reach/Sneak choice — no new turn structure.

- **Cookie Cards:** Reachers split the value as normal, unless Dobbers are present — Dobbers steal 2 cookies each (capped at the card's value) off the Reachers, who split whatever's left (possibly zero, if enough Dobbers showed up). Sneakers split the Crumb pile — unless a Dobber is present this flip, in which case Sneakers get nothing and the Crumbs stay put for a future flip.
- **Treat cards:** never split. Priority order Sneak > Dob > Reach — whichever of those is the sole player choosing that action wins the Treat outright. If nobody is uniquely solo, it stays unclaimed and re-contests next flip; if still unclaimed when the Operation ends, it's lost rather than carrying forward.
- **Caught! cards:** no bust. Each player's fate depends only on their own choice, plus the same Dobber-scares-off-Sneakers rule as Cookie cards. Reach risks losing cookies to Crumbs — protected if the player is that family member's **Favourite** (a secret, per-Operation assignment — "mummy's boy," "daddy's girl," the sibling the pet follows), doubled if it's their **Watcher** (the family member who's onto them this Operation). Dob always backfires.
- **No elimination:** cookies can never go negative. A player at zero stays in and can still win Crumb splits — nobody is benched.
- **Deck:** the same full 15 Cookie + 15 Caught! + that Operation's Treat, cut randomly in half each Operation (not a proportional split — an Operation can skew Cookie-heavy or Family-heavy by luck).

### Does it add new screens or phases?
No new screens — the existing Reach In / Sneak Out choice screen gains a third button (Dob), and reveal screens gain flavour text for the new outcomes (see companion doc for example copy).

### Does it change scoring?
Yes, substantially — resolution differs per card type. Full rules in the companion doc.

### Does it change the win condition?
No — still the biggest Cookie Stash at the end of the match.

### Does it change settings?
Yes — **Kitchen Rules is hidden/disabled entirely when Dibber Dobber is active.** All 3 of its options govern what happens on a bust, and this mode has no bust.

### Design note
This mode went through extensive simulation-based balance testing before landing here — several structurally different versions of the Dob mechanic were tried and discarded (percentage-based steals, flat totals, uncapped steals) before arriving at "2 cookies per Dobber, capped at card value, remainder to Reachers." A late-stage finding — that Sneak could passively dominate a full Operation by harvesting other players' losses with zero friction — led to the "scare-off" rule (Dob's presence also disrupts Sneak, not just Reach) on both Cookie and Family cards. Full reasoning and the discarded-versions table are in the companion document.

---

## 9. Thematic Vocabulary

| Generic term | What this game calls it |
|---|---|
| Round | Cookie Raid |
| Score / points | Cookies |
| Game over screen heading | Who took the cookies from the cookie jar? |
| Play again | *[ASSUMPTION: "Another Raid?"]* |
| Quit confirm button | *[ASSUMPTION: "Yeah, sneak back."]* |
| Quit cancel button | "Keep raiding!" |
| Settings overlay title | **Cookie Playbook** |
| Play CTA (menu) | **Raid the Jar!** |
| Stay (continue the Cookie Raid) | Reach |
| Leave (bank and exit) | Sneak |
| Third action (Sylly Mode only) | Dob |
| Hazard card | Caught! card |
| The moment 2 matching Caught! cards appear | BUSTED! |
| Artifact-equivalent card | Treat (Special Treat / Super Special Treat — see §10) |
| Leftover cookies on the counter | Cookie Crumbs |
| A player's private banked total | Cookie Stash |
| Cookie Cards, values 1–5 | Handful of Cookies |
| Cookie Cards, values 6–12 | Batch of Cookies |
| Cookie Cards, values 13–17 | Mountain of Cookies |
| The 5 hazard archetypes | Mum, Dad, Big Sibling, Little Sibling, Family Pet |
| Protected family member relationship (Dibber Dobber) | Favourite — "you're their Favourite" (e.g. mummy's boy, daddy's girl) |
| Threat family member relationship (Dibber Dobber) | Watcher — "they're onto you" |
| Last-place end-screen label | Red-Handed |
| Flip history log | Cookie Trail |

**Quit overlay** (per suite Quit Overlay Checklist — must have all 5 elements):
- Emoji: 🍪
- Heading: *[ASSUMPTION: "Back to bed already?"]*
- Subtext: *[ASSUMPTION: "Your Cookie Stash will be lost."]*
- Confirm: "Yeah, sneak back."
- Cancel: "Keep raiding!"

**Play CTA note:** per the Universal Menu Standard, "Raid the Jar!" is the only game-voiced element on the menu screen — Settings button always reads "Settings" (thematic name lives inside the overlay as "Cookie Playbook"), How to Play is always identical, and "← Back to the Box" is always unchanged.

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
- **5 Treat cards** — one shuffled into the deck at the start of each Operation per the fixed schedule below. A treat not yet revealed at Operation's end carries forward in the deck naturally. A treat revealed on the counter but uncollected when the Operation **busts** is permanently discarded. Point values are fixed to treat identity (see §6).

| Operation | Treat added | Tier | Points |
|---|---|---|---|
| 1 | Strawberry Shortbread Cookies | Special Treat | 5 |
| 2 | Red Velvet Cookies | Special Treat | 5 |
| 3 | White Chocolate Macadamia Nut Cookies | Special Treat | 5 |
| 4 | French Macarons | Super Special Treat | 10 |
| 5 | Chocolate Truffle Brownies | Super Special Treat | 10 |

**Example entry (Cookie Card):**
A Cookie Card has: a cookie value (integer, from the fixed list above) and a tier (Handful / Batch / Mountain, derived from the value) which determines its display art.

**Example entry (Caught! card):**
A Caught! card has: a family-member type (one of the 5 above), a display illustration, and a pool of flavour lines for two moments — the 1st reveal (a warning line, e.g. Mum: "Told you, no cookies before dinner!") and the 2nd reveal / BUST (a different line, e.g. Mum: "Hand out of the jar. NOW!"). No numeric value — its only function is the matching-pair bust check.

**Example entry (Treat card):**
A Treat card has: a treat name (one of the 5 above), a display illustration, a tier (Special / Super Special), and a point value (5 or 10, per tier).

**Does the quantity of any content scale with player count?**
No — same fixed 15+15+5 deck regardless of player count, matching the source game (which supports the same unscaled deck from 3 up to 8 players). `[Deliberately reconsidered and confirmed this session — see §19, Cookie Assortment.]`

| Player count | Total quantity | Notes |
|---|---|---|
| 3–8 | 15 Cookie + 15 Caught! + 5 Treat (fixed) | No scaling |

---

## 11. Custom Visual Assets

| Field | Answer |
|-------|--------|
| **Is there a repeated visual primitive?** | Yes — three: Cookie Cards, Caught! cards, Treat cards |
| **How many distinct faces/types does it have?** | Cookie Cards: **3 tiers** (Handful / Batch / Mountain — resolved this session, no longer 15 unique assets). Caught! cards: 5 distinct family members. Treats: 5 distinct treats across 2 tiers. |
| **Should it be skinnable with custom art later?** | `[ASSUMPTION: maybe]` — not decided |
| **Default look for v1** | `[ASSUMPTION: emoji/CSS-first, matching most of the suite's default pattern]` — still open |

Even a "maybe" means the render seam **`cjarRenderCard(id, opts)`** should be built from day one so a skin can be dropped in later without game-logic changes — this is the established suite pattern (`pkoRenderCard`, `flwRenderCard`). Game logic and packets use card ID only; the render function is the single swap point for a future skin pack.

**If items are ever displayed compactly/overlapping:** not applicable — cards aren't held in a fanned hand, they're revealed one at a time in the centre.

---

## 12. Multiplayer Classification

| Field | Answer |
|-------|--------|
| **Multiplayer mode** | MDLM (Multi-Device Lobby Mode) only — each player on their own device. `multiplayerOnly: true`, `supportedModes: ['mdlm']`. No PTP or TLM variant makes sense for this game — the simultaneous private-choice mechanic fundamentally requires individual devices. |
| **In the ideal multiplayer version, does each player have their own device, or do teams share a device?** | Each player has their own device |
| **Is there any information that must stay private to one player or one team's device?** | Yes — each player's Cookie Stash (banked total across previous Cookie Raids) is private. Their in-progress, not-yet-banked Raid total is also private until they Sneak or it busts. |
| **Are there moments where players act simultaneously?** | Yes — every single Reach / Sneak decision (plus Dob in Dibber Dobber), every Cookie Raid, is simultaneous. There is no sequential turn order. |
| **Are there moments where one device should be locked while another is active?** | No — there's no "active player" concept. Everyone is either deciding or waiting for others to finish deciding. |
| **When it's not a player's turn, what do they see, and can they interact with anything, or is it read-only?** | Not applicable in the usual sense. A player who has already Sneaked this Cookie Raid watches the rest play out (read-only) until the Raid ends. |
| **Any roles or phases that simply don't work with multiple devices?** | None — this game is arguably a *better* fit for individual devices than the physical original. |
| **Do any settings or events temporarily hide information that's normally visible?** | No — Dibber Dobber (§8) changes outcomes and adds a third action, but doesn't hide anything that's normally visible; all actions, the Crumb pile, and affinities remain exactly as private/public as the base game. |

---

## 13. Screens — Plain English List

1. Game menu (every game has this)
2. Setup / player names (every game has this)
3. Cookie Raid intro — a shared screen showing "Raid X of [Match Length]" and a fresh, empty table
4. Main game screen (the central, persistent screen for the duration of a Cookie Raid — see UI spec in §14)
5. Action choice screen — private, shown after each card flip; two buttons in base game (Reach / Sneak), three in Dibber Dobber (Reach / Sneak / Dob)
6. Reveal screen — everyone's choice appears at once; shows who chose what, who left, and what was earned or lost
7. BUSTED! screen — shown when a Cookie Raid ends via the second matching Caught! card
8. Cookie Raid summary — a player's own banked total for that Raid, added to their Cookie Stash
9. End of Match screen — final standings, Red-Handed label for last place

`[ASSUMPTION: screens 4–6 may partially collapse at the technical spec stage depending on animation approach.]`

---

## 14. Complex Interaction / UI Spec

**The main game screen (screen 4 above)** is the one screen worth speccing in plain English before the technical spec, since it's the shared persistent view all players see for the duration of a Cookie Raid.

**Three-zone layout (Header / Stage / Controls — suite standard):**

```
┌────────────────────────────────┐
│ HEADER                         │
│ Raid 2 of 5   Cookie Crumbs: 4 │
│ [Family member warning strip]  │
├────────────────────────────────┤
│ STAGE                          │
│                                │
│  [Face-down deck]  [Last card] │
│                                │
│  → tap last card = Cookie Trail│
│                                │
├────────────────────────────────┤
│ CONTROLS                       │
│  [Reach]  [Sneak]  ([Dob])     │
│  — or player names in their    │
│    chosen zones after reveal — │
└────────────────────────────────┘
```

**Stage area — two persistent elements:**
- The face-down deck (remaining cards this Raid — card back art, showing count)
- The most recently flipped card, always visible

**Cookie Trail:** tapping or long-pressing the most recently flipped card opens the Cookie Trail — a scrollable log of every flip this Raid, showing card revealed, actions chosen, and cookies gained/lost per player. This is the suite's standard slide-up scrollable overlay (same pattern as How to Play and Settings). The tap target is the card itself — no separate button needed. If this isn't immediately discoverable in playtesting, we'll add a small "trail" icon or leave it as a hidden feature players find organically; either way the function gets built regardless.

**Controls area — action zones:**
- In base game: two full-width buttons, Reach and Sneak, chosen privately before reveal
- In Dibber Dobber: three buttons, Reach / Sneak / Dob
- After reveal: the buttons dissolve and player names populate into the zone matching their choice (Reachers in the Reach area, Sneakers in the Sneak area, etc.) — a compact, readable summary of who went where without needing avatars or animations at this stage

**Header strip — family member warning:**
A small persistent icon row (5 slots, one per family member) showing which Caught! types have appeared once this Raid — the in-game cheat sheet. Dim = not yet seen, lit = appeared once (warning), removed = busted and removed from play. Always visible, never tapped — passive reference only.

**Cookie animation:** a small, reusable cookie-counter increment/decrement animation — plays whenever a player's cookie count changes (gain from a Reach, loss from a Family card, Crumb pickup, Dob backfire). Same animation primitive reused across all triggers, different direction (up = gain, down = loss). This is the one lightweight animation worth building from day one since it applies to nearly every state change in the game.

---

## 15. Rule Reference / In-Game Cheat Sheet

The family-member warning strip (§14 header) handles the most important in-game reference need — tracking which Caught! types have appeared this Raid — passively and always-visibly, without needing a separate overlay. The Treat tier reference (5pts vs 10pts) is simple enough to absorb from the How to Play card rather than an in-game lookup.

| Field | Answer |
|-------|--------|
| **What reference material do players need mid-game?** | Which Caught! types have already appeared once this Raid (so players can judge bust risk) — handled by the persistent family-member warning strip in the Header (§14), always visible, no tap required |
| **How do they access it?** | Always visible — passive strip in the Header zone. No separate lookup or overlay needed. |
| **Does opening it interrupt the game, or is it a non-blocking overlay?** | Non-blocking — it's always present, never opened or closed |
| **Is it a static image/asset, or does it need to render dynamically from data?** | Dynamic — reflects which family members have appeared this Raid in real time |
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
| Reach In / Sneak Out choices reveal | A quick drumroll-to-reveal sting |
| Lone player Sneaks Out (jackpot) | A triumphant, slightly cheeky "score" jingle |
| Treat collected | An extra-sweet chime, distinct from the regular cookie sound — bigger chime for Super Special Treats |
| Operation busts, cookies lost | A deflating "aww" sound — comedic, not harsh |
| High Alert Mode triggers (if enabled) | A dramatic "on alert" sting with the family member's name |
| End of match | A warm, celebratory jingle |

---

## 17. End Screen Content Mockup

`[ASSUMPTION: full mockup below, all copy placeholder pending §9 confirmation]`

```
[END SCREEN TITLE — TBD, e.g. "THE JAR'S EMPTY"]
[Match complete — 5 Operations played]

🍪 TOP COOKIE THIEF
[Name] — [X cookies]

2nd  [Name] — [X cookies]
2nd  [Name] — [X cookies]   ← shared rank if tied
4th  [Name] — [X cookies]

OPERATION HISTORY
       [Ava] [Ben] [Cal] [Dana]
Op 1     3     0     5    2
Op 2     0     8     0    0
Op 3     4     4     0    1
TOTAL    7    12     5    3

[Bake Another Batch]   [Leave the Kitchen?]
```

- Tied players share the same rank number — no tiebreak within a rank
- Last-place label: **Red-Handed** — locked
- Cookie Raid history grid always shown — useful even in a short match to see the swings

**Does this table stay useful for very short games?**
Yes — even Quick Snack (3 Raids) is short enough that the grid stays useful.

---

## 18. How to Play — Teaching Points

**Ordered list:**
1. Every Cookie Raid, a new jar is opened.
2. Cards are revealed one at a time — most show cookies, which get split evenly among everyone still Reaching.
3. Some cards show a family member catching you in the act. The first one's just a scare — but if the *same* family member shows up twice in one Raid, everyone still in loses that Raid's cookies. BUSTED!
4. After each card, everyone secretly decides: keep Reaching, or Sneak and bank what you've got.
5. If you're the only one who Sneaks, you scoop everything left on the counter — including any Treat sitting there.
6. Whatever's in your Cookie Stash is safe forever — busting only costs you that Raid's takings.
7. After the last Cookie Raid, whoever's got the biggest Cookie Stash wins.

**Easy-to-miss exceptions to flag explicitly:**
- Being caught twice by the *same* family member busts the Raid — two different family members appearing once each does *not*.
- Sneaking alone is the only way to claim a Treat — if two or more people Sneak on the same flip, the Treat stays on the counter for a future flip (or is lost if the Raid busts while it's still showing).

**Sylly Mode card:** "✨ Dibber Dobber — you get a third move: Dob. If someone Dobs while you're Reaching, they can take some of your cookies before you get a share. Sneaking is safe... unless a Dobber's about, in which case they scare you off empty-handed too. Nobody ever loses everything — worst case, you're back to zero and still in the game."

---

## 19. Open Questions & Design Notes

**Resolved this session (moved out of "open"):**
- Treat point value → fixed to treat identity, not collection order. Fixed deck-entry schedule: Raid 1 Strawberry Shortbread (5pts), Raid 2 Red Velvet (5pts), Raid 3 White Choc Mac (5pts), Raid 4 Macarons (10pts), Raid 5 Brownies (10pts). Carry-forward confirmed: unrevealed treat stays in deck; revealed-but-uncollected treat is permanently discarded on a bust.
- Round terminology → Cookie Raid; settings menu → Cookie Playbook; leftover pile → Cookie Crumbs; banked total → Cookie Stash; stay action → Reach; leave action → Sneak; last-place label → Red-Handed; flip history log → Cookie Trail; game over heading → "Who took the cookies from the cookie jar?"
- 5 family member archetypes locked: Mum, Dad, Big Sibling, Little Sibling, Family Pet — with a flavour-line pool per archetype for both the 1st-reveal warning and the 2nd-reveal BUST
- Treat hierarchy locked (names only — value-attribution mechanic still open, see §6)
- Cookie Card art resolved to 3 visual tiers (Handful/Batch/Mountain), not 15 unique assets
- Settings locked: Snack Friendly (Off/Safe First Grab/Warm-Up), Kitchen Rules (Standard Burn/On Guard/High Alert Mode), Match Length (Quick Snack 3/Full Feast 5)
- **Cookie Assortment (player-count deck scaling) — explicitly deferred, not dropped outright.** Watch specifically for a "starved" feel in 6–8 player playtests before deciding whether a fix is needed.
- **Dibber Dobber deck variance** — a genuinely random half-cut of the 31-card combined pool is kept as-is. Simulation shows Gemini's "12 Family / 3 Cookie" nightmare scenario has only a 0.14% chance of occurring, and even a 30/70 split only happens 2.7% of the time. Natural clustering around 7/7 is already strong. Deliberately engineering more variance (e.g. a 30/70 range) was considered and shelved — too much to explain for marginal benefit; revisit only if playtesting shows flat rounds being a real problem.
- **Starting stash → 5 cookies** (tested vs 3 — starting at 3 increased first-3-flip wipeout probability from 5.2% to 21.3%, too punishing early; 5 is a better first-day default). Note as a consideration for future tuning if playtesting shows players feel insufficiently pressured.
- **UI layout locked**: Header (Raid counter + Crumb count + family warning strip) / Stage (face-down deck + last card, tap for Cookie Trail) / Controls (action buttons before reveal, player name zones after reveal) — see §14.
- The cookie-card-burn Kitchen Rules alternative — resolved: not used; Dibber Dobber took a different direction.

**Still genuinely open:**
- Exact brand colour hex within the amber-800/cookie-brown space (§1) — colour space confirmed clear, specific hex TBD at technical spec
- Tiebreak rule if tied on both cookies and Treats after the "most Treats" tiebreak (§5)
- Whether to actively discourage 3-player games given the source material's "weaker at 3" criticism
- Default v1 art treatment — emoji/CSS-first vs. a bigger illustrated budget
- Last-place end-screen label, if any (§17)

**Things flagged from earlier design discussion, explicitly OUT OF SCOPE for this draft:**
- The "damp squib" fix beyond Snack Friendly — largely superseded by Snack Friendly now existing as a real setting, but note Snack Friendly is opt-out (Off exists), so the underlying weak point is still reachable if a player chooses Off.
- PWA-native presentation enhancements: shaking-jar/crumbs visual hinting at a private stash, a public "Greed History Log" showing attempts without outcomes.

**Resolved from earlier design discussion (now built into §8):**
- The "Who Me? / Yes YOU!" accusation-and-voting phase — became the full Dob action and the "song's beats" flavour mapping in Dibber Dobber (Reach/Sneak/Dob outcomes mapped onto "Not me!" / "Yes, you!" / "Then who?").
- The cookie-card-burn twist — not used; Dibber Dobber took a different direction (a third action plus no-bust/no-elimination, rather than a burn-based twist).

**Things that might be complicated to implement (flag for Claude Code):**
- Simultaneous reveal logic with no turn order at all is a different multiplayer shape from most of the suite's existing games.
- The Caught! card removal rule (persistent across the match, and now with 3 different behaviours depending on Kitchen Rules) needs careful state tracking.
- Kitchen Rules' High Alert Mode requires tracking a *dynamically added* card (the extra family member copy) that didn't exist in the fixed 15+15+5 base deck — worth flagging early since it breaks the "fixed deck" assumption used elsewhere in this brief.

---

## Open Questions

1. [NON-BLOCKER] Exact brand colour hex in the amber-800/cookie-brown space — colour space is confirmed clear, specific hex TBD at technical spec.
2. [NON-BLOCKER] Tiebreak rule if tied on both cookies and Treats — shared win (per Pecking Order precedent) is the working assumption.
3. [NON-BLOCKER] Whether to actively discourage 3-player games in copy.
4. [NON-BLOCKER] Default v1 art treatment — emoji/CSS-first vs. bigger illustrated budget (see §22 for dimensions regardless of treatment).
5. [NON-BLOCKER] Whether Cookie Assortment (deck scaling by player count) needs a real setting after 6–8 player playtesting.
6. [NON-BLOCKER] Starting stash of 5 cookies — confirmed as the day-one default, flagged for tuning consideration after playtesting if players feel insufficiently pressured early.

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

**Setup:** 4 players — Ava, Ben, Cal, Dana. Cookie Raid 3 (of 5) begins. Locked family names used. Treat in play this Raid: Red Velvet Cookies (Special Treat, 5 points).

**The deck is shuffled** (remaining Cookie Cards, remaining Caught! cards, and this Raid's newly-added Treat — Red Velvet Cookies — shuffled in).

1. **Card revealed: Cookie Card, value 9 (a Batch of Cookies).** All 4 players are still in. 9 ÷ 4 = 2 each, 1 Cookie Crumb left on the counter.
   - Ava, Ben, Cal, and Dana each privately choose Reach or Sneak. Ava chooses Sneak; Ben, Cal, and Dana all choose Reach.
   - Reveal: **Ava** leaves alone with her 2 cookies — and since she's the *only* one leaving this turn, she also takes the 1 Cookie Crumb. Ava banks 3 cookies this Raid and steps out.
2. **Card revealed: Caught! card — Mum.** First time Mum has appeared this Raid — just a scare ("Told you, no cookies before dinner!"). Ben, Cal, and Dana are still in.
3. **Card revealed: Cookie Card, value 5 (a Handful of Cookies).** 5 ÷ 3 = 1 each, 2 Cookie Crumbs left on the counter.
   - Ben and Dana choose Reach. Cal chooses Sneak.
   - Reveal: **Cal** leaves alone — takes his 1 cookie plus the 2 Cookie Crumbs, for 3 cookies total this Raid. He's also alone, so he'd take the Red Velvet Cookies Treat if it were on the counter — it isn't yet.
4. **Card revealed: Caught! card — Mum (again).** Second Mum this Raid — **BUSTED!** Ben and Dana, still in, lose everything they'd collected this Raid (1 cookie each from step 3). One copy of Mum is removed from the game for the rest of the match (under Standard Burn — under On Guard it would stay in play).

**Result:** Ava banks 3 cookies to her Cookie Stash, Cal banks 3, Ben and Dana bank 0. The Red Velvet Cookies were never revealed this Raid — they carry forward into Cookie Raid 4's deck.

---

**A moment from a single player's point of view (private information):**
During step 3, from **Ben's** device: he sees the same shared counter state everyone sees (5 cookies just split, 2 Cookie Crumbs, Mum has appeared once) — but he has no visibility into what Ava's Cookie Stash looks like after leaving in step 1, or what Cal is about to choose this turn. He only sees his own running total and the shared public state. When Cal's choice reveals as Sneak, Ben learns *that* Cal left and roughly what he took (public), but Ava's and Cal's full match totals remain private until the end screen.

---

## 22. Asset Spec (Rough — Pre-Screen Design)

This section gives enough dimensional guidance for art to begin in parallel before screens are fully designed. All dimensions are estimates based on standard mobile-first PWA conventions for the suite and will be confirmed/adjusted at technical spec stage.

**General assumptions:**
- Primary target is mobile portrait, ~390px wide (iPhone-class viewport)
- Cards are the central visual element — they take up a large share of the shared game screen
- Three distinct card types: Cookie Cards, Caught! cards, Treat cards
- All three share the same physical card dimensions for consistency

---

### Card dimensions

| Use | Approx size | Notes |
|---|---|---|
| **Full reveal card** (centre of shared screen) | ~280 × 380px | The primary card state — shown when a card flips. Tall portrait card. Should feel substantial on mobile, not cramped. |
| **Counter/path card** (already-revealed cards sitting on the table) | ~80 × 110px | Smaller thumbnail shown in a horizontal strip of previously revealed cards this Operation. Needs to be identifiable at this size — family member face or cookie tier icon must read clearly. |
| **Treat on counter** (uncollected treat displayed) | ~100 × 136px | Slightly larger than the path thumbnail since it's an active, collectible item players are eyeing |

---

### Cookie Cards — 3 art assets needed

Each tier is one reusable asset with the numeric value rendered as a text overlay. Art direction below is rough guidance for the illustrator — exact style TBD pending §11 v1 art decision.

| Tier | Values | Asset description |
|---|---|---|
| **Handful of Cookies** | 1–5 | A small stack of 3–4 cookies, loosely piled. Feels modest, like someone grabbed a couple. |
| **Batch of Cookies** | 6–12 | A fuller plate or pile — maybe 8–10 cookies stacked. Clearly more enticing. |
| **Mountain of Cookies** | 13–17 | An overflowing, teetering tower of cookies. Should feel absurd and delicious. Biggest visual impact. |

Cookie art style note: warm, illustrative, slightly cartoonish — these are kids' game assets, not a food photography brief. Consistent biscuit/cookie type across all three tiers (likely choc-chip, as the default "cookie jar cookie").

---

### Caught! cards — 5 art assets needed

One illustration per family member archetype. Each needs to work at both full-reveal size (~280×380px) and counter-thumbnail size (~80×110px) — the face/expression must read at the small size.

| Archetype | Personality | Art direction (rough) |
|---|---|---|
| **Mum** | Strict, authoritative | Arms crossed, eyebrow raised, pointing finger. Classic "caught you" parent energy. |
| **Dad** | Easy-going, conspiratorial | Surprised but slightly amused. Maybe a finger-to-lips "shhh" gesture — he might want one too. |
| **Big Sibling** | The snitch | Smug, one eyebrow up, already pointing toward "Mum's room." Could read boy or girl — keep it ambiguous or do two variants. |
| **Little Sibling** | Needy, loud | Wide eyes, mouth open mid-wail or mid-demand, arms reaching. Clearly younger/smaller than Big Sibling. |
| **Family Pet** | Chaotic, non-verbal | A dog/cat/parrot face — excited, alert, knocking something over. The chaos agent. Could be multiple animal types shown together if that works. |

Key constraint: all 5 faces need a clear silhouette difference at ~80px wide. Mum and Dad should read as adults, Big/Little Sibling clearly as different ages, Pet as unmistakably an animal.

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

Visual distinction between Special and Super Special should be legible at counter-thumbnail size — consider a subtle glow, a star badge, or a richer background treatment on the Super Special cards.

---

### Shared card frame

All three card types share the same frame/border treatment for consistency. Suggested elements (final design TBD):
- Rounded corners (~16px radius at full size)
- A warm, slightly textured card background (cream/off-white — not stark white)
- Card type indicated by a top strip colour: e.g., warm amber for Cookie Cards, a distinct colour per family member for Caught! cards, gold/purple for Treats
- The numeric value (Cookie Cards) or family member name (Caught! cards) rendered in a legible font at the bottom of the full-reveal card

---

### Other game UI assets (non-card)

| Asset | Approx size | Notes |
|---|---|---|
| Cookie Crumbs counter | Icon ~32×32px + text | Small, persistent UI element — a crumb pile icon with a running count |
| Family member "seen once" warning indicator | ~40×40px per slot, ×5 | The persistent strip (§15) showing which Caught! types have appeared this Operation. Needs to work as a small icon row. |
| Reach In button | Full-width, ~56px tall | The primary action — should feel big and satisfying to tap |
| Sneak Out button | Full-width, ~56px tall | Secondary action — visually distinct from Reach In (different colour/weight) but same physical size |
| Cookie Stash summary (private screen) | ~full width | Shows the player's own running total — large number, simple layout |
| BUSTED! reveal animation frame | Full screen | The dramatic bust moment — see §16 for sound notes; the visual should match |
