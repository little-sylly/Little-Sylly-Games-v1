# Batch 2 New Games — High-Level Summary for Claude Code
**Status:** Design phase complete. Ready for technical spec review.
**Purpose:** Quick reference for architecture planning and infrastructure dependencies.

---

## 1. COUNTING SHEEP (Ninety-Nine Card Game)
**Short ID:** `csh`

### Identity
- **Theme:** Bedtime counting sheep — running total climbs toward 99 (waking up)
- **Tone:** Cosy, sleep-themed, warm
- **Colour:** Soft moonlit indigo / midnight navy with cream accents
- **Emoji:** 🐑

### Core Mechanic
- Running total starts at 0, climbs each turn
- Players play one card; total must stay ≤99
- Can't play = lose a life (token), round resets
- Special cards modify the count (skip, reverse, subtract, random, set-to-99)
- Last player with lives wins

### Game Engine Required
- **Card Engine:** Yes — reuses the card model from Pass (`js/lib/cards.js` if built)
- **Card Rendering:** Yes — standard playing card SVG renderer
- **Special card effects:** 7 card types with unique behaviours
- **Hand size:** 3 cards (tight, tense)
- **Deck:** Custom themed deck (52 cards: numbered 2–K + Ace as special, plus 7 unique special cards)

### Multiplayer Classification
- **Individual devices** (recommended) or pass-the-phone
- Private hand, public count announcement
- Turn-based sequential play
- **Readycheck needed:** No (simple sequential turn flow)
- **Firebase writes:** Draw events only (minimal)

### Data Needs
- Card deck definition (custom themed, not standard suits)
- No additional data files required

### Open Decisions
- Hand size: 3 or 4 cards? (Recommend 3)
- Lives count: 3 or 5? (Recommend 3 for short, sharp game)
- Random card range: +5 to +15? (Needs tuning)
- "Lullaby" relief card — include or skip? (Nice-to-have, not critical)

### Dependencies
- **Hard dependency:** Card engine from Pass (if Pass built first, this is ~20% cheaper)
- **Soft dependency:** Card SVG renderer (also from Pass)

### Build complexity
**Medium.** Mechanics are simple, the card engine is the cost, but it's a subset of what Pass already needs.

---

## 2. FRUIT SALAD (Cockroach Poker)
**Short ID:** `frt`

### Identity
- **Theme:** Sassy fruit personalities in a bowl — bluffing game with attitude
- **Tone:** Silly, warm, kid-friendly, attitude-laden
- **Fruit cast:** Angry Apple, Shy Strawberry, Smug Banana, Sour Lemon, Chill Watermelon, Dramatic Grape, Sneaky Pear, Sleepy Peach
- **Colour:** Bright fruit-salad palette, suggest juicy coral or watermelon pink
- **Emoji:** 🍓

### Core Mechanic
- Deck: 8 fruit types × 8 cards each = 64 cards
- On your turn: take a card (or one passed to you), declare what it is face-down, pass to another player
- Receiver: call "true" / "false" / or peek and re-pass with their own declaration
- Flip to check: caller wins if right, passer wins if wrong — card stays face-up in front of loser
- Lose if you collect 4 of the same fruit — you're out
- Last player standing wins

### Game Engine Required
- **Card Engine:** Yes — same as Counting Sheep (reuses Pass infrastructure)
- **Card Rendering:** Yes — 8 fruit types with personality labels
- **Bluffing/calling UI:** Yes — simple true/false/pass buttons, no complexity
- **Hand management:** Private hand display, pass mechanism

### Multiplayer Classification
- **Individual devices** (required for clean secret-pass mechanic)
- Private hand, secret card pass
- Simultaneous nomination with sequential calling
- **Readycheck needed:** When a card is passed, recipient must receive it privately before others see the declaration
- **Firebase writes:** Card passes with declaration (moderate volume)
- **Targeted writes:** Yes — each card pass is recipient-private until they call/pass

### Data Needs
- Fruit deck definition (8 types × 8 cards, personality labels)
- No additional data files required

### Open Decisions
- Are personalities purely cosmetic (v1), or do they affect mechanics later? (Recommend purely cosmetic for v1)
- Sylly Mode idea: "Blender" — random recipient passes, wildcard cards? (Parked for v1.1)

### Dependencies
- **Hard dependency:** Card engine from Pass (same as Counting Sheep)
- **Soft dependency:** Card SVG renderer
- **Architecture note:** Targeted Firebase writes pattern (same as any game with secret information)

### Build complexity
**Medium.** Same card-engine complexity as Counting Sheep, plus targeted-write complexity (which Group Therapy already demonstrates).

---

## 3. UNDERGROUND CHINCHIRORIN (Kaiji Dice Game)
**Short ID:** TBD pending theme decision

### Identity (Theme TBD — choose one)
Pick from: **Lucky Ducks** (warmest), **Hot Streak** (clean/neutral), **Three Little Pigs** (storybook), **Snake Eyes** (cool/speakeasy), or **Bowl of Fate** (mystical)

**Recommendation:** **Snake Eyes** — preserves the gambling *thrill* Kaiji arc appeals to, but as a friendly speakeasy rather than brutal pit.

### Core Mechanic
- Three dice, up to 3 throws per turn to get a scoring result
- Need a pair to score (odd die = your number) OR hit a special roll
- Special rolls: 4-5-6 instant win, 1-2-3 instant loss, triples very strong, triple-1 jackpot
- Players compare scores; higher wins
- Press-your-luck: do you keep a weak pair and risk bust on re-roll?
- Dice falling = bust (physical rule, digitized as "overflow" mechanic)

### Game Engine Required
- **Dice Engine:** Yes — new component, not reusable from card games
- **Three-dice roller with state tracking:** Up to 3 throws, tracking best result
- **Comparison logic:** Score ranking (4-5-6 > triples > pairs > bust)
- **Suit ranking:** Yes (tiebreaker for equal pairs)
- **No card rendering needed**

### Multiplayer Classification
- **Individual devices or shared** — both viable (simpler than card games)
- Public dice results, no hidden information
- Turn-based sequential play
- **Readycheck needed:** No — results are public immediately
- **Firebase writes:** Minimal (just round results)

### Data Needs
- No data files needed (pure mechanic)
- Possibly a hints/assumptions pool for flavour text (optional)

### Open Decisions
- **CRITICAL:** Choose a theme from the five options (this unlocks everything else)
- Dealer rotation: include Kaiji's "pass-or-deal-twice" mechanic? (Nice-to-have)
- Scoring/stakes model: betting chips, flat points, or pot system? (Depends on theme)
- "Dice falls out" rule: keep as digital mechanic? (Iconic but not necessary)

### Dependencies
- **Hard dependency:** Dice rolling engine (new, isolated component)
- **Soft dependency:** None (doesn't share infrastructure with card games)

### Build complexity
**Low-Medium.** The dice mechanics are simple and self-contained. The theme decision is the blocker, not the engineering.

---

## 4. ETA? (Original Vehicle Estimation Game)
**Short ID:** `eta`

### Identity
- **Theme:** Chaotic delivery dispatch office — drivers with absurd vehicles radioing ETAs
- **Tone:** Absurdist, social, funny
- **Colour:** Dispatch-board amber/orange or GPS-route blue
- **Emoji:** 🛵 or ⏱️

### Core Mechanic
1. A **distance** is revealed (e.g. "Earth to the Moon")
2. Each player gets a **different vehicle** (skateboard, helicopter, pogo stick, rocket, etc.)
3. Players privately estimate **time of arrival** + assumptions (free text)
4. All ETAs revealed together on a **comparative graph** (horizontal timeline)
5. Players **vote** on whose ETA they find most believable
6. **Scoring:** +2 points per vote your ETA receives
7. Post-vote: a benchmark "real answer" is shown as flavour (scoring nothing)

### Game Engine Required
- **No dice/card engine needed**
- **Estimation UI:** Simple number input + text-for-assumptions
- **Comparative graph display:** Horizontal bar/timeline showing all ETAs sorted, with vote counts as badges
- **Voting UI:** Single-choice voting (can't vote for yourself)
- **Result visualization:** Graph with marked votes

### Multiplayer Classification
- **Individual devices** (recommended for private estimation)
- Private vehicle assignment + private ETA entry
- Simultaneous estimation with **readycheck matrix** (all ETAs submitted before reveal)
- Simultaneous voting
- **Firebase writes:** Vehicle assignments, ETA submissions, vote results (moderate)

### Data Needs
- **Distance prompts:** New data file `data/eta-data.json` — `{ id, reference, km, tier }`
  - ~18 examples provided in brief
  - ~40–60 total entries viable
  - Tier 1: Human-scale (marathon, running track)
  - Tier 2: Geographic (coast-to-coast, around Earth)
  - Tier 3: Astronomical (Earth-Moon, Earth-Sun) — comedy tier
- **Vehicle pool:** Reuses existing `vehicles` category from `words.json` ✓

### Open Decisions
- **CRITICAL:** Confirm scoring model: **Option C** (social voting only, benchmark for laughs) is recommended. This resolves the "accuracy vs creativity" tension.
- Vote mechanism: pick single favourite, or rank all? (Recommend single-pick for speed)
- Dispatcher role: everyone drives + votes, or one judge? (Recommend everyone participates)

### Dependencies
- **Soft dependency:** `words.json` vehicles category (already exists)
- **Hard dependency:** `eta-data.json` content file (needs building)
- **No shared card/dice infrastructure**

### Build complexity
**Medium.** The content build (distance set) is the real cost, not the mechanics. Once you have 40–50 distances, the game is straightforward.

---

## INFRASTRUCTURE & SEQUENCING NOTES

### Card Game Infrastructure Stack
If building card games, **sequence them together on shared infrastructure:**

1. **Pass** (`pas`) — builds foundation
   - Card model (`js/lib/cards.js`)
   - Card SVG renderer
   - Real-time turn cycling
   - Delta-encoded drawing sync (Group Therapy dependency)
   
2. **Counting Sheep** (`csh`) — reuses Pass infrastructure
   - Adds: special card effects logic
   - Adds: running-total tracking
   
3. **Fruit Salad** (`frt`) — reuses Pass infrastructure + Group Therapy's targeted writes
   - Adds: bluffing/calling UI
   - Adds: private hand pass mechanism
   
4. **Big 2** (future) — extends card infrastructure
   - Adds: five-card poker-hand engine (the only real new complexity)
   - Reuses: everything else from the three above

**Build Big 2 last in this sequence.** It depends on all the infrastructure the others establish, and the five-card engine is the only component that's genuinely new.

### Non-Card Games (Independent)
- **Kaiji Dice Game** — isolated dice engine, no shared infrastructure
- **ETA?** — pure social voting game, no shared infrastructure

---

## QUICK REFERENCE TABLE

| Game | ID | Theme Status | Engine Type | Build Cost | Dependencies |
|------|----|----|-----|------|----|
| Counting Sheep | `csh` | ✅ Locked | Card | Medium | Pass card infrastructure |
| Fruit Salad | `frt` | ✅ Locked | Card | Medium | Pass + targeted writes |
| Kaiji Dice | TBD | ⚠️ Choose theme | Dice | Low-Med | None (isolated) |
| ETA? | `eta` | ✅ Locked | Social/voting | Medium | eta-data.json content file |

---

## NOTES FOR CLAUDE CODE

**When writing technical specs:**

1. **Batch 2 games are all Phase 1-complete** — all design decisions are made or explicitly flagged as "TBD" (only the Kaiji theme is blocking)

2. **Card game cluster:** The three card games share deep infrastructure. Plan the `js/lib/cards.js` module as a real, reusable library from the start — don't build it inside Pass and port it later.

3. **The five-card engine (Big 2):** If this is ever built, it's the one component that warrants unit tests. Poker-hand detection bugs are subtle and painful.

4. **ETA? content:** The distance data file is straightforward but needs careful curation — make sure every distance is universally legible (not local). The 18 examples in the brief prove there's plenty of content available.

5. **Kaiji theme decision:** This is the one true blocker. The mechanic is completely solid and ready to build the moment a theme is chosen.

**Multiplayer patterns:** All four games use established patterns from existing work (readyCheck, targeted writes, sequential turns). No new multiplayer architecture needed.

---

**End of summary. Ready for technical specs once theme decisions are locked and any remaining design questions are answered.**
