# New Game Concepts — Batch 2 (Adaptations + 1 Original)
## For: Little Sylly Games
## Status: Brainstorm — fleshing out four owner ideas. Nothing locked. All open.

Four games here: three adaptations of existing games (each with a strong mechanical skeleton already) and one original that needs the most design work. For each: the mechanic distilled, an honest theme assessment, alternatives where the theme is weak, and the open questions to resolve before a full Phase 1 brief.

---
---

# 1. NINETY-NINE → "Counting Sheep"
### The bedtime-themed climbing-number game.

**Source:** Ninety-Nine / O'NO 99 — the addition card game where you play cards to push a running total upward without going over 99.

**Theme verdict: STRONG. Keep it.** Counting sheep before sleep is a genuinely inspired fit — the running count *is* the sheep count, the goal of avoiding 99 maps onto "don't wake up / don't tip into a restless night," and the special cards translate beautifully into sleep vocabulary. This is the rare case where the theme makes the mechanic *more* intuitive, not less. No alternatives needed.

## The Mechanic (distilled)

- A running total starts at 0. Players take turns playing one card, each adding (or modifying) the total.
- You must play a card without taking the total over 99.
- If you can't, you lose a life (token) and the round resets.
- After playing, you draw back up to a fixed hand size (3 cards is standard).
- Last player with lives wins.

The genius is the special cards that prevent the count from being a simple march to 99 — reverses, skips, holds, subtractors, and the "set to 99" bomb. This is where the digital format and your theme shine.

## The Counting Sheep spin

**Title:** Counting Sheep
**Short ID:** `cs9` or `csh` (avoid `cs` if too generic — confirm against prefix list)
**Tagline:** *"Don't hit 99. Don't wake up."*
**Universe:** Drifting off to sleep, counting sheep over a moonlit fence. The count climbs. Hit 99 and you're wide awake again — back to square one.
**Emoji:** 🐑
**Brand colour:** Soft moonlit indigo / midnight navy with cream accents.

## The special cards — your digital-format opportunity

This is where your instinct about leveraging the digital format is exactly right. Physical 99 uses fixed card values. You can invent themed special cards with effects that would be fiddly to track on paper but trivial on screen:

| Your idea | Effect | Sleep theming |
|-----------|--------|---------------|
| **"1, 2, skip a few..."** | Adds a *random* number (e.g. 5–20) to the count | The classic "1, 2, skip a few, 99, 100" rhyme — you lost count! A jolt of uncertainty. |
| **"Doze"** / **"Nap"** | Skip — count unchanged, next player's turn | You dozed off mid-count. The standard "9 = pass." |
| **"99 Sheep"** | Sets count to exactly 99 | The "King = 99" bomb. Hands the next player a near-impossible spot. |
| **"Toss & Turn"** | Reverses direction, count unchanged | The standard "4 = reverse." |
| **"Counting Backwards"** | Subtracts 10 (or choose ±10) | The standard "10 = ±10." Sheep jumping back over the fence. |
| **"Wide Awake"** (rare) | Forces a chosen player to take the next turn at the current high count | A targeted-attack card. Pure digital-format flavour. |
| **"Lullaby"** (rare) | Resets the count to a low number (e.g. 20) — relief card | Original to your version — a moment of calm. Adds a tactical "save" option. |

**Design note on the random card ("skip a few"):** a random-value card is a fun chaos injection but needs a bounded range or it breaks the game (a card that could add 50 makes the count unsurvivable). Suggest a tight range like +5 to +15, shown to the player *after* they commit to playing it — so it's a gamble. "I'll play Skip a Few and hope it's small."

## Scoring / lives

Standard 99: each player starts with 3–5 lives (tokens). Lose one each time you can't play. Last one standing wins. The sleep theme: lives could be "🌙 moons" or "sleep streaks" — each time you bust, you wake up and lose a moon.

## Multiplayer classification

Individual devices — each player holds a private hand. This is a card game like Pass (`pas`), so it shares the same multiplayer-only profile and the same need for the card-rendering infrastructure. **If Pass is built first, Counting Sheep reuses the card engine and renderer almost entirely** — it's a lighter game on the same foundation. Worth sequencing them together.

Pass-the-phone: viable but clunky (hidden hands, lots of passing). Multiplayer-first recommended, same as Pass.

## Open questions
- Hand size: 3 (standard, tense) or 4 (O'NO 99 style, more options)? Recommend 3.
- Lives count: 3 or 5? More lives = longer, gentler game. For a sleep theme, maybe 3 — short and sweet.
- The random card range — needs playtesting to tune.
- Does this share a deck model with Pass, or is it a custom themed deck (no suits, just numbered sheep + special cards)? A custom themed deck is more on-brand and simpler — no suits needed. Recommend custom deck.

---
---

# 2. COCKROACH POKER → "Fruit Salad"
### The bluffing/calling game, themed for kids and clarity.

**Source:** Cockroach Poker (Kakerlakenpoker) — the pure bluffing game where you pass a face-down card to someone and declare what it is ("this is a rat"); they either believe you or call your bluff, and whoever's wrong takes the card.

**Theme verdict: YOUR FRUIT IDEA IS RIGHT. Keep it, refine the personalities.** Your reasoning is sound — the original's bugs/vermin (cockroach, rat, bat, stinkbug, scorpion, toad, fly, spider) are hard for kids to tell apart and a bit grim. Fruit is instantly legible, friendly, and the "sassy personality" angle gives each fruit a memorable identity. This is a clean, smart reskin.

## The Mechanic (distilled)

- Deck has 8 creature types, 8 cards each (64 total).
- On your turn, take a card (from hand, or one passed to you), pass it face-down to another player, and **declare** what it is: "This is a strawberry."
- The receiver does one of three things:
  1. **Call "true"** — they think you're telling the truth
  2. **Call "false"** — they think you're bluffing
  3. **Peek and pass it on** — look at it secretly, then pass to another player with their own declaration (can't pass back to someone who's already seen it)
- When someone calls: the card flips. If the caller is right, the *passer* keeps the card face-up in front of them. If wrong, the *caller* keeps it.
- **You lose if you collect 4 of the same type** (4 strawberries in front of you = you're out), or if you can't pass on your turn.

The whole game is reading faces and reputations. "He always bluffs strawberries." "She'd never lie twice in a row." Pure social.

## The Fruit Salad spin

**Title:** Fruit Salad (alternatives: "Rotten," "Bad Apple," "Sus Fruit")
**Short ID:** `frt` or `fsl`
**Tagline:** *"This is definitely a strawberry. Trust me."*
**Universe:** A fruit bowl full of fruit with attitude. Each fruit has a personality, which is pure flavour — it doesn't change the mechanic, just makes the eight types memorable and funny.
**Emoji:** 🍓
**Brand colour:** Bright fruit-salad colours — could be a rainbow/multi but pick one anchor, maybe a juicy coral or watermelon pink.

## The eight fruits — sassy personalities

Your "angry apple / shy strawberry" instinct is great. Personalities are purely cosmetic but make declarations funnier ("this is the angry apple" has more table energy than "this is an apple"). A starting set of 8:

| Fruit | Personality | Emoji |
|-------|-------------|-------|
| **Angry Apple** | Always furious, red-faced | 🍎 |
| **Shy Strawberry** | Blushing, hiding | 🍓 |
| **Smug Banana** | Thinks it's better than you | 🍌 |
| **Sour Lemon** | Bitter about everything | 🍋 |
| **Chill Watermelon** | Unbothered, cool | 🍉 |
| **Dramatic Grape** | Everything is a crisis | 🍇 |
| **Sneaky Pear** | Shifty, up to something | 🍐 |
| **Sleepy Peach** | Always dozing off | 🍑 |

(The personalities are also a natural hook for the custom assets you mentioned down the line — each fruit has a face. For v1, emoji + a personality label is plenty to set the silly tone.)

## Why fruit works better than bugs (for your specific case)

- Instantly distinguishable — no one confuses a banana with a grape; people *do* confuse a stinkbug with a cockroach
- Kid-friendly and not gross
- The personalities make the eight types stick in memory, which matters because the whole game is tracking who tends to lie about what
- Sets the silly tone you want without needing custom art on day one

## Multiplayer classification

Individual devices strongly preferred — each player has a private hand, and the face-down pass is the core mechanic. The "pass a card secretly and declare it" interaction is clean on individual devices: you select a card, choose a recipient, type/select your declared fruit, and it arrives face-down on their screen. Pass-the-phone is awkward here (you'd have to hide the card from everyone but the recipient).

**Targeted Firebase writes** needed — the passed card's true identity goes only to the recipient's device; everyone else sees "Jake passed a card to Mia and said: Angry Apple."

## Open questions
- 8 fruits × 8 each = 64 cards. Keep the original's count exactly (it's balanced) — confirm.
- Lose condition: 4 of a kind (original) — keep. Confirm.
- Do personalities ever affect play, or purely cosmetic? Recommend purely cosmetic for v1 (keeps it pure Cockroach Poker). Could add personality-based special rules in a Sylly Mode later.
- Sylly Mode idea: **"Blender"** — once per game each player can declare a card must be passed to a *random* player, or a wildcard "fruit cocktail" card enters that can be declared as anything. Parked for later.

---
---

# 3. KAIJI CHINCHIRORIN → "(theme needed)"
### The three-dice gambling game from the underground arc.

**Source:** Chinchirorin (Cee-lo / 4-5-6) — the three-dice game from Kaiji Season 2. Roll three dice into a bowl; you need a pair to score (the odd die is your number); special rolls win or lose big.

**Theme verdict: NO THEME YET — and the Kaiji theme can't be used directly (IP). This is where I'll give you the most options.** The mechanic is excellent and very implementable. The challenge is purely thematic: what's the Little Sylly wrapper?

## The Mechanic (distilled — this is clean and great)

Each player, on their turn as "the roller," throws three dice (up to 3 attempts to get a scoring result):

| Roll | Result |
|------|--------|
| **4-5-6** | Instant win (highest possible) — beats everything |
| **Triple** (e.g. 3-3-3) | Very strong — "triples." Triple-1 is the jackpot. |
| **A pair + odd die** | The odd die is your *score* (pair of 2s + a 5 = "you have a 5"). Higher odd die wins. |
| **1-2-3** | Instant loss (worst possible) |
| **No pair after 3 throws** | Bust / no score |
| **A die falls out of the bowl** | Instant bust (in the original — "shōben") |

Players compare scores; higher wins the stake. It's fast, tense, luck-driven with a press-your-luck layer (do you re-roll a weak pair and risk busting?).

**The press-your-luck tension is the fun:** you rolled a pair of 6s and a 2 (score: 2, weak). Do you keep it, or re-roll all three hoping for better — risking 1-2-3 or a bust? That decision, repeated, is the whole game.

## Theme options — since there's none yet

The mechanic is a gambling dice game. Little Sylly's tone is warm and silly, so a literal gambling-den theme (Kaiji's actual setting) is both off-brand and IP-adjacent. Here are five directions, warmest to coolest:

### Option A — "Lucky Ducks" 🦆 (warmest, most Sylly)
A duck-pond carnival game. You're tossing three rubber ducks into a pond; their stamped numbers are your roll. Bright, silly, family-friendly. "Three ducks, find a pair." The bust ("a die falls out") becomes "a duck escapes the pond." Warm and on-brand, low stakes feel.

### Option B — "Hot Streak" 🎲 (clean, neutral, lets the mechanic speak)
No heavy theme — a clean, stylish dice game with a hot/cold streak visual identity. Glowing dice, a heat meter that builds on good rolls. Minimal flavour, maximum mechanical clarity. The safe choice if you don't want to over-theme a pure luck game.

### Option C — "Three Little Pigs" 🐷 (storybook spin)
Three dice = three pigs. A 4-5-6 is "all three pigs safe in the brick house." 1-2-3 is "the wolf got them." Triples are "the pigs built something amazing together." Storybook-warm, instantly familiar narrative scaffold, great for the bust/win framing. Possibly too childish depending on your audience.

### Option D — "Snake Eyes" 🐍 (cooler, the gambler's-den energy made friendly)
Leans into classic dice-game cool — "snake eyes," "boxcars," the vocabulary of craps and back-alley dice — but stylised as a friendly speakeasy rather than Kaiji's brutal pit. Jazz-age, smoky-but-charming. Keeps the gambling *energy* that makes Kaiji exciting, drops the despair. The 1-2-3 instant loss = "snake eyes." Captures what you liked about the source without the IP.

### Option E — "Bowl of Fate" 🥣 / fortune-telling spin
Three dice cast into a fortune-teller's bowl. Each roll is a "reading." Mystical, tarot-adjacent vocabulary — "the cast," "an omen" (4-5-6), "a curse" (1-2-3). A bit more original, slightly witchy-cosy. Could be charming or could be a stretch.

**My recommendation: Option D ("Snake Eyes") or Option B ("Hot Streak").** Snake Eyes preserves the specific *thrill* that drew you to the Kaiji arc — the gambler's tension, the press-your-luck nerve — while making it warm enough for your box. Hot Streak is the safer, cleaner choice if you'd rather the elegant mechanic carry the game without a strong narrative. Both honour the source without touching the IP.

**One mechanic worth borrowing from Kaiji specifically (non-IP):** the *dealer rotation* tension. In Underground Chinchirorin, you can pass on being the dealer, but if you take it you must deal twice. The dealer/roller-vs-field dynamic (one person rolls, everyone else bets against them) is a great social hook and entirely mechanical, not IP. Worth building in.

## Multiplayer classification
Individual devices or shared — dice games work both ways. Each player rolls on their own device; results broadcast to the table. The press-your-luck re-roll decision is private until locked. Simultaneous or turn-based dealer rotation both viable. Lighter multiplayer needs than the card games — no private hand to hide, just roll results to sync.

## Open questions
- **Theme** — the big one. Pick a direction from A–E (or propose your own).
- Stakes/scoring: the original is a betting game (perica). Your version needs a points model — bet chips each round? Flat points for winning a round? A pot system? This depends partly on theme.
- Do you keep the "die falls out = bust" rule? It's iconic in Kaiji but meaningless digitally (dice can't physically fall) — could reimagine as a "shake too hard / overcook the roll" risk mechanic, or drop it.
- Dealer rotation: include the Kaiji-style pass-or-deal-twice mechanic, or simple round-robin?

---
---

# 4. ORIGINAL — "ETA?"
### Estimate your vehicle's arrival time. Vote on whose guess is most believable.

**Source:** Original — built on the `vehicles` category in `words.json`. Closest cousins: Wits & Wagers (estimation) and your own Going Once concept (guess + judge).

**Theme verdict: The CONCEPT is strong and original. The DISTANCE PROMPT problem is real and solvable — see below.** This needs the most design work of the four, exactly as you flagged. Let me tackle your two hard problems directly: the distance prompts, and the scoring.

## The Mechanic (your design, organised)

1. A **distance** is revealed to everyone (e.g. "Earth to the Moon").
2. Each player is secretly assigned a **different vehicle** from the vehicles category (skateboard, helicopter, pogo stick, rocket...).
3. Each player privately estimates **their own** vehicle's time of arrival over that distance, stating any assumptions they like.
4. All ETAs are revealed together.
5. Players **vote** on whose ETA they think is the most accurate/believable.
6. Results shown on a comparative graph; points awarded.

The fun: the comparison and the justification. "A rocket takes an hour because of launch prep" vs "a skateboard is 6 days of nonstop pushing." The arguing over assumptions is the heart.

## PROBLEM 1: The distance prompts (your main struggle)

Your instinct is exactly right — local distances ("Chapel Hill to Indro, 8km") fail because they're not universally legible. The fix is a **curated set of universally-understood distances**, organised into tiers by scale. You were worried about having enough — here's a starter set proving there are plenty:

### Tier 1 — Human-scale (relatable, everyday)
- The length of a football pitch (~0.1 km)
- A 5km park run (5 km)
- A full marathon (42 km)
- The English Channel swim (34 km)
- Around a standard running track (0.4 km)
- The height of Mount Everest, base to peak (8.8 km)

### Tier 2 — Geographic (big but graspable)
- London to Paris (~340 km)
- The length of Italy, top to toe (~1,200 km)
- Coast to coast across America (~4,500 km)
- The Great Wall of China, end to end (~21,000 km)
- All the way around the Earth (~40,000 km)
- The Nile, source to sea (~6,650 km)

### Tier 3 — Astronomical (absurd, the comedy tier)
- Earth to the Moon (~384,000 km)
- Earth to the Sun (~150 million km)
- Across the Grand Canyon (~29 km)
- The depth of the Mariana Trench (~11 km)
- Earth to Mars at closest approach (~55 million km)
- One full lap of Saturn's rings (~spectacle)

**The key design principle:** every prompt is something a person can *picture* or has *heard of as a reference*, even if they don't know the exact km. "A marathon" means something. "Earth to the Moon" means something. "Chapel Hill to Indro" doesn't. You show the famous reference as the headline, with the actual km in brackets for the scoring math. **There are easily 40–60 of these** — enough for a solid data file, expandable forever. This is very much a `words.json`-adjacent content build, same investment as any content game.

## PROBLEM 2: Scoring — your two options, weighed

You asked: benchmark against real average speeds, or pure social voting?

**Option A — Benchmark scoring (calculated "correct" answer):**
Each vehicle has an assumed average speed. The game calculates a "true" ETA (distance ÷ speed) and scores players on how close their estimate is.
- *Pro:* objective, satisfying reveal ("the actual answer was...")
- *Con:* kills the assumption-flexibility you explicitly wanted ("rocket needs launch prep"). If there's a calculated true answer, creative assumptions become *wrong* answers. It also requires you to assign and balance speeds for every vehicle, and players will argue the benchmark is unfair ("my pogo stick assumption was reasonable!").

**Option B — Pure social voting (no correct answer):**
Players vote on whose ETA is most believable/best-reasoned. Points come only from votes.
- *Pro:* preserves the creative-assumption freedom completely. The justification *is* the game. Warm, social, argument-driven — very on-brand.
- *Con:* no objective anchor; can feel arbitrary; a charismatic guesser beats a correct one.

**My recommendation: a hybrid that resolves the tension — "Option C".**

Run it as **pure social voting (Option B) as the core**, but add a **light benchmark reveal at the end as a "reality check," not a scorer.** After voting, show each vehicle's rough real-world ETA as a fun fact ("a real helicopter would actually do this in ~3 hours") — but points come *only* from votes. This way:
- Creative assumptions are never "wrong" — votes reward good reasoning, not accuracy
- You still get the satisfying "what's the real answer" moment as flavour
- No need to perfectly balance vehicle speeds for scoring — the benchmark is approximate and pressure-free

**Scoring model (Option C):**
- Each player votes for the ETA they find most accurate/believable (can't vote for themselves)
- +2 points per vote your ETA receives
- Optional: the vehicle you were assigned has a "difficulty" — defending a pogo stick's ETA over Earth-to-Moon and still getting votes could earn a small bonus
- The benchmark "real answer" is shown after, for laughs, scoring nothing

This keeps the game **social-first**, which is where your instinct was leaning ("base it on people's guesses so it's more social") and which fits the box better than a math quiz.

## The ETA? spin

**Title:** ETA? (great name — keep it)
**Short ID:** `eta`
**Tagline:** *"Skateboard to the Moon? Show your working."*
**Universe:** A chaotic delivery dispatch office. Every player is a driver with a wildly inappropriate vehicle, radioing in their estimated time of arrival. The dispatcher (the group) decides whose ETA they actually believe.
**Emoji:** 🛵 or ⏱️
**Brand colour:** Dispatch-board amber/orange, or a GPS-route blue.

## The presentation (your graph idea)
A comparative results screen is the right call. Show each player's vehicle + their ETA on a horizontal timeline/bar chart, sorted shortest to longest, with vote counts as a badge on each. The visual gag is the spread — a helicopter at 3 hours next to a pogo stick at 8 months, both on the same axis. This is a chart_display-style visual and very doable.

## Multiplayer classification
Individual devices — each player privately gets their vehicle and privately enters their ETA + assumptions. Simultaneous estimation (readyCheck matrix), then simultaneous reveal, then a voting round. Same structural pattern as several of your party games. Pass-the-phone viable but slower (private vehicle assignment needs a pass-gate).

## Word bank & content
- **Vehicles:** reuses the existing `vehicles` category in `words.json` ✓ (your idea — clean reuse)
- **Distances:** needs a new small data file `data/eta-data.json` — `{ id, reference, km, tier }`. ~40–60 entries to start.
- Possibly a third optional element: an `assumptions` hint pool ("remember to consider: fuel stops? sleep? launch prep?") to prompt creative reasoning — could be hardcoded flavour, not a data file.

## Open questions
- **Scoring:** confirm Option C (social voting + benchmark-as-flavour). This is the central decision.
- Does every player get a *different* vehicle (your stated design), or can vehicles repeat? Different is better — forces comparison. But with 8 players you need 8+ distinct vehicles available per round from the category — confirm `vehicles` is deep enough (it likely is).
- How are assumptions captured — free text typed by each player, shown at reveal? (Recommend yes — the assumptions are the comedy.) This adds a text-input + display element.
- Vote format: rank all ETAs, or pick a single favourite? Single favourite is simpler and faster; ranking is richer. Recommend single-pick for v1.
- Is there a "dispatcher" role each round (a non-driver who judges), or does everyone drive and everyone votes? Everyone-drives-everyone-votes is simpler and keeps all players active. Recommend that.

---
---

# Summary & Sequencing

| # | Working title | Source | Theme status | Build complexity | Notes |
|---|--------------|--------|-------------|-----------------|-------|
| 1 | Counting Sheep | Ninety-Nine | ✅ Strong, keep | Medium (card engine) | Shares infrastructure with Pass — sequence together |
| 2 | Fruit Salad | Cockroach Poker | ✅ Strong, keep | Medium (card engine + targeted writes) | Also shares card infrastructure |
| 3 | (TBD — rec. Snake Eyes / Hot Streak) | Kaiji Chinchirorin | ⚠️ Needs theme decision | Low (dice engine, simplest) | Cleanest mechanic, just needs a wrapper |
| 4 | ETA? | Original | ✅ Concept strong, scoring resolved | Medium (content + voting + chart) | The most original; distance set is the content build |

**A note on infrastructure synergy:** Counting Sheep (#1) and Fruit Salad (#2) both want the card model and card-rendering component that Pass (`pas`) would establish. If you build Pass first, these two become much cheaper. The three card games could form a "card games corner" of the box on shared infrastructure. Worth considering as a deliberate cluster rather than scattered one-offs.

**Easiest quick win:** the Kaiji dice game (#3) is mechanically the simplest — a contained dice engine, no private hands, no card rendering, light multiplayer. Once it has a theme, it's the fastest of these four to ship.

**Most original / most "yours":** ETA? (#4) — it's the only one not adapted from an existing game, it reuses content you already have (vehicles), and the social-voting-with-benchmark-flavour scoring is a genuinely nice design. It's the one that would feel most distinctly Little Sylly.

Want me to take any of these to a full Phase 1 brief? My suggestion would be ETA? (since it's original and the scoring's now resolved) or the Kaiji game (since it just needs a theme pick and then it's a fast build).
