# New Game Concepts — "The Resistance" Clone
## For: Little Sylly Games — Phase 22+ consideration
## Status: Design concepts for review — not yet briefs

Three concepts are presented below. Each is a complete thematic take on The Resistance's core mechanic. They vary in tone, setting, and the small mechanical twist that makes each feel like a Little Sylly original.

After reading, the recommended next step is to pick one (or frankly combine elements across them), then use `new-game-brief-template.md` to flesh it out fully before any technical work begins.

---

## Before the concepts — what we're cloning and what we're keeping

**The Resistance core loop (unchanged in all three concepts):**
1. Secret roles are assigned — most players are on one side, a minority are traitors
2. A rotating Leader nominates a team for a Mission
3. All players vote publicly to approve or reject the team
4. If approved: nominated players secretly vote to succeed or sabotage the mission
5. Only the count of sabotages is revealed — not who voted what
6. First side to win 3 of 5 missions wins
7. If 5 consecutive team proposals are rejected in a single mission: traitors win automatically

**What makes the game tick (and what the theme needs to support):**
- The discussion phase between nominations is where the game lives. Players accuse, defend, and lie openly.
- The pass-the-phone model actually suits this game well for the role reveal phase — but multiplayer (individual devices) is where this game truly sings. Each player's vote is private, which is the whole point.
- The traitor minority must be small enough to be deniable (typically 1–3 in a 5–10 player game).

**The one multiplayer-specific change that elevates the game:**
In the physical game, mission cards are physically shuffled before reveal so you can't tell who played which card — you only know the count. With individual devices, this is handled automatically and perfectly. No card shuffling theatre needed. The UX can focus entirely on the social game.

**The Sylly Mode approach across all concepts:**
Rather than adding complexity (the base game is already mentally demanding), Sylly Mode in all three concepts adds a *single special role* — one player with a unique ability that creates a third axis of tension without changing the core loop. Inspired by Avalon's Merlin mechanic.

---

---

# CONCEPT 1 — "MESS HALL"
### The traitor is at the dinner table.

---

## The Pitch

A group of old friends organises a series of dinner party plans — restaurant bookings, a beach trip, a group gift, a surprise birthday — but someone in the group keeps mysteriously torpedoing everything. The "Who's ruining the fun?" energy. No spies, no war, just that specific social paranoia of a group chat where one person is quietly causing drama.

This is the most accessible concept. Lowest barrier to entry, most immediately relatable, most in line with the existing Little Sylly tone. Think *Friday Night Dinner* meets *Succession*, set entirely in a group chat.

**Why it works for Little Sylly:**
The existing games (LTTP, LI5, Great Minds) thrive on social familiarity. This concept lives in the same emotional neighbourhood — it's about trust and betrayal between friends, not soldiers or spies. The vocabulary is warm and funny before it gets tense.

---

## Identity

| Field | Value |
|-------|-------|
| **Full name** | Mess Hall |
| **Short ID** | `msh` |
| **Tagline** | "Someone's ruining the plans. It might be you." |
| **Thematic universe** | A group of friends planning things together — someone keeps wrecking it |
| **Emoji** | 🍽️ |
| **Brand colour** | Rose / warm red — `rose-500` |

---

## Roles

| Role | Display name | Count | What they know | Goal |
|------|-------------|-------|----------------|------|
| Loyal | **The Crew** | Majority | Nothing secret — they're just trying to have a good time | Get 3 plans to succeed |
| Traitor | **The Flake** | 1–3 (scales with player count) | They know who the other Flakes are | Sabotage 3 plans without being caught |

**Sylly Mode — special role:**
- **The Organiser** (1 player, Crew-aligned): Knows who exactly one Flake is. Wins an extra point if the group successfully identifies at least one Flake by game end. Loses their bonus if they're accused and voted out (they can be outed, which is a fun metagame risk for using the knowledge too aggressively).

---

## Thematic Vocabulary

| Generic term | Mess Hall calls it |
|---|---|
| Mission | **The Plan** |
| Mission team | **The Group** |
| Mission success | **Good Times** ✅ |
| Mission sabotage | **Bailed** ❌ |
| Team nomination vote | **Who's In?** |
| Vote approve | **I'm Down** |
| Vote reject | **Hard Pass** |
| Traitor | **The Flake** |
| Loyal player | **The Crew** |
| Round | **Weekend** |
| Score / progress | **Plans Made / Plans Wrecked** |
| Game over | **Post-Mortem** |
| Play again | **New Group Chat** |
| Quit | **Leave the Chat?** |
| Settings | **The Group Rules** |
| Leader | **The Organiser** (generic) / this round's planner |

---

## The Five Plans (Mission Names)

Rather than generic "Mission 1–5," each plan has a name that escalates in stakes. Purely flavour — no mechanical difference between them except player count follows The Resistance standard table.

1. 🍕 **The Takeaway Order**
2. 🏖️ **The Weekend Away**
3. 🎂 **Mum's Surprise Party**
4. 🎄 **The Holiday Gathering**
5. 💍 **The Big Occasion**

---

## Sylly Mode — "Drama Mode"

**What changes:** The Organiser role is added (see above). Additionally, after each failed plan, the Leader for the next round must publicly name one person they *don't* suspect — a social commitment that creates a trail of evidence across the game. No mechanical effect, but it creates receipts.

---

## The UX feel

The role reveal screen shows the player's group chat name card — like an iMessage contact bubble. Flakes see each other listed (small, discreet, unmistakeable). The voting screen looks like reaction emojis. The mission result is a group chat message: "[Plan name]: it's happening!" or "[Plan name]: it's off. Again." The Post-Mortem screen reveals all roles in a group chat format — the Flakes' names turn red, everyone else stays green.

---

## Mechanical spin (the Little Sylly addition)

After the third failed plan, before the final two missions, the group gets **One Accusation** — a free, binding vote to remove one player from the game entirely. Majority rules. The removed player reveals their role. This adds a Werewolf-style elimination that the original Resistance doesn't have, but it's optional (settings toggle: **Finger Pointing** ON/OFF, default OFF) so purists can skip it.

---

## Player count fit

5–10. Works well at 6 which is the sweet spot for the couch use case. At 5 (1 Flake), it's tense and readable. At 8+ (3 Flakes), it's chaotic and hilarious.

---

---

# CONCEPT 2 — "WALK THE PLANK"
### There are mutineers on this ship.

---

## The Pitch

A pirate crew sets out on a series of raids. Most of the crew are loyal — they want treasure. But a few have been paid off by a rival captain and are quietly sabotaging each job. The Captain rotates (as in The Resistance — the Leader role). The question isn't whether your crew is capable. It's whether they're yours.

**Why it works for Little Sylly:**
Pirates give you great vocabulary (raids instead of missions, plunder instead of points, the plank instead of elimination), a strong visual identity, and — crucially — a power dynamic that makes the team nomination phase feel natural. A captain choosing crew for a raid is a more intuitive metaphor than a resistance cell choosing operatives. The theme also skews slightly older/edgier than Mess Hall without being grim.

---

## Identity

| Field | Value |
|-------|-------|
| **Full name** | Walk the Plank |
| **Short ID** | `wtp` |
| **Tagline** | "Every crew has a rat. Find it before the gold does." |
| **Thematic universe** | Golden Age piracy — raids, betrayal, rum, and treasure |
| **Emoji** | 🏴‍☠️ |
| **Brand colour** | Deep gold — `yellow-600` or `amber-600` |

---

## Roles

| Role | Display name | Count | What they know | Goal |
|------|-------------|-------|----------------|------|
| Loyal | **The Crew** | Majority | Nothing secret | Complete 3 raids |
| Traitor | **The Rat** | 1–3 | Rats know each other | Scuttle 3 raids |

**Sylly Mode — special role:**
- **The Quartermaster** (1 player, Crew-aligned): Once per game, after a raid result is revealed, may secretly look at one player's loyalty card (their role). Cannot reveal this publicly but can lie or be coy about what they saw. This is The Resistance's "Inquisitor" plot card, but baked into Sylly Mode rather than the base game.

---

## Thematic Vocabulary

| Generic term | Walk the Plank calls it |
|---|---|
| Mission | **The Raid** |
| Mission team | **The Shore Party** |
| Mission success | **Plunder** ✅ |
| Mission sabotage | **Scuttled** ❌ |
| Team nomination | **Calling the Shore Party** |
| Vote approve | **Aye** |
| Vote reject | **Nay** |
| Traitor | **The Rat** |
| Loyal player | **The Crew** |
| Leader this round | **The Captain** |
| Round | **Voyage** |
| Progress track | **Plunder Haul / Raids Scuttled** |
| Game over | **The Reckoning** |
| Play again | **New Voyage** |
| Quit | **Abandon Ship?** |
| Settings | **Ship's Articles** |

---

## The Five Raids (Mission Names)

1. ⚓ **The Merchant Intercept**
2. 🏝️ **The Island Cache**
3. 🏰 **The Fort Raid**
4. 👑 **The Governor's Galleon**
5. 💀 **The Spanish Treasure Fleet**

---

## Sylly Mode — "Mutiny Waters"

**What changes:** The Quartermaster role is added. Additionally, after each successful raid, one piece of the **Treasure Map** is revealed — a five-piece visual that, once complete (three successful raids), shows the location of the Final Chest. The Rats win a bonus if they can correctly name the Final Chest location before the Crew claims it. Purely flavour/bonus scoring, doesn't change win condition.

---

## The UX feel

Strong nautical visual language — the mission track is a voyage map, the vote is a "Raise your hand" animation rendered as a ship's mast flag (up = Aye, down = Nay). The role reveal is a scroll unfurling. The Reckoning screen shows a ship's crew roster — Rats are revealed with a skull marker. This concept has the most visual potential of the three.

---

## Mechanical spin (the Little Sylly addition)

**The Plank:** If the same player is nominated for a shore party and it gets rejected three times in a row, that player can invoke **The Plank** — forcing a binding vote on whether to throw any one player overboard (eliminate + reveal role). This is purely theatrical and opt-in (they can choose not to invoke it), but it creates a dramatic release valve for deadlocked games. Settings toggle: **The Plank** ON/OFF, default ON.

---

## Player count fit

5–10. Most thematically satisfying at 7–8 where you have 2 Rats and the team nomination tension is richest. Works at 5 with 1 Rat but feels tight.

---

---

# CONCEPT 3 — "OPENING NIGHT"
### Someone on this production is trying to kill the show.

---

## The Pitch

A theatre company is preparing for opening night. Five acts to rehearse. Most of the cast and crew are dedicated professionals — but a rival theatre has planted saboteurs in the production. Every rehearsal, the director (rotating) picks a team. Every mission is a rehearsal that either goes brilliantly or mysteriously falls apart. The Saboteurs know each other. Everyone else is just trying to make something beautiful.

**Why it works for Little Sylly:**
This is the most creative and least done concept in the Resistance space. Theatre gives you rich vocabulary (acts instead of missions, curtain call instead of game over, the Stage Manager's Book as the mission history). The theme has a gender-neutral, arts-friendly energy that suits the inclusive Little Sylly aesthetic. It also has natural tension escalation — Act I failing feels low-stakes, Act V failing feels catastrophic.

This is the highest-ceiling concept creatively. It's also the one most likely to need more design work to feel coherent — theatre metaphors can tip into twee if handled poorly.

---

## Identity

| Field | Value |
|-------|-------|
| **Full name** | Opening Night |
| **Short ID** | `ont` |
| **Tagline** | "Five acts. One opening night. Someone's burning it down." |
| **Thematic universe** | A theatre production under siege from within |
| **Emoji** | 🎭 |
| **Brand colour** | Deep purple — `purple-700` or `violet-700` |

---

## Roles

| Role | Display name | Count | What they know | Goal |
|------|-------------|-------|----------------|------|
| Loyal | **The Company** | Majority | Nothing secret | Rehearse 3 acts successfully |
| Traitor | **The Saboteur** | 1–3 | Saboteurs know each other | Ruin 3 rehearsals |

**Sylly Mode — special role:**
- **The Understudy** (1 player, Company-aligned): Knows the identity of exactly one Saboteur. Wins a bonus if the production succeeds AND the Saboteur they know is correctly named at the end. Loses the bonus if they're ever voted off a rehearsal team (Director rejects them) — pressure to use their knowledge wisely without drawing attention.

---

## Thematic Vocabulary

| Generic term | Opening Night calls it |
|---|---|
| Mission | **The Rehearsal** |
| Mission team | **The Call Sheet** |
| Mission success | **Nailed It** ✅ |
| Mission sabotage | **Disaster** ❌ |
| Team nomination | **Drawing up the Call Sheet** |
| Vote approve | **On Board** |
| Vote reject | **Not This One** |
| Traitor | **The Saboteur** |
| Loyal player | **The Company** |
| Leader this round | **The Director** |
| Round | **Act** |
| Progress track | **Acts Rehearsed / Acts Ruined** |
| Game over | **Curtain Call** |
| Play again | **New Production** |
| Quit | **Close the Production?** |
| Settings | **The Director's Notes** |

---

## The Five Acts (Mission Names)

1. 🎬 **Act I — The Read-Through**
2. 🪑 **Act II — Blocking**
3. 💡 **Act III — Tech Rehearsal**
4. 🎤 **Act IV — Dress Rehearsal**
5. 🌹 **Act V — Opening Night**

---

## Sylly Mode — "The Critics Are In"

**What changes:** The Understudy role is added. Additionally, after each completed rehearsal (success or failure), a **Review** is posted — a single line of flavour text visible to all players. "Sources close to the production report surprising tension in Act II." Reviews are pre-written, randomly selected from a pool, and mean nothing mechanically — but they create a shared narrative thread and inevitably get players accusing each other based on pure vibes. This is the most "Little Sylly" mechanic of the three.

---

## The UX feel

The most visually distinctive of the three. The role reveal screen is a backstage call sheet — your name, your role, the production name. The voting screen is show of hands at a table read. The mission result is a theatre notice pinned to a board. The Curtain Call screen reveals the full company — Saboteurs get a red spotlight, The Company gets a green one. The five-act structure gives the game a natural dramatic arc that a generic "Mission 1–5" doesn't.

---

## Mechanical spin (the Little Sylly addition)

**The Note:** The Director (Leader) may, once per game, give one player a "Note" — a privately delivered single word (typed into their device) after a mission result is revealed. The recipient sees it privately. It cannot be a player name or a role name. This is an unofficial whisper mechanic that creates information asymmetry without changing the voting structure. Settings toggle: **The Director's Note** ON/OFF, default ON.

This is the most original addition of the three — it leans into the private communication idea from LTTP but in a much simpler form.

---

## Player count fit

5–10. Works at any count. Most thematically satisfying at 6–7.

---

---

# Comparison & Recommendation

| | Mess Hall 🍽️ | Walk the Plank 🏴‍☠️ | Opening Night 🎭 |
|---|---|---|---|
| **Tone** | Warm, funny, relatable | Adventurous, slightly edgy | Creative, dramatic, theatrical |
| **Vocabulary fit** | Easiest — everyone gets it | Strong — pirate vocab is universally legible | Highest ceiling — could tip into obscure |
| **Visual potential** | Good (group chat aesthetic) | Highest (nautical map, scrolls, flags) | High (playbill, spotlight, notice board) |
| **Mechanical spin** | Finger Pointing (elimination vote) | The Plank (forced reveal) | The Note (private word to one player) |
| **Sylly Mode strength** | Moderate | Strong (Quartermaster peek) | Strongest (The Critics + Reviews) |
| **Fit with existing games** | Best tonal fit with LTTP/LI5 | Best standalone identity | Most original in the space |
| **Multiplayer necessity** | High — private votes need individual devices | High | High — The Note mechanic only works with multiplayer |
| **Design risk** | Lowest | Low | Moderate (theatre theme needs confident execution) |
| **My recommendation** | **Best first game** | **Best if you want a strong visual identity** | **Best long-term ceiling** |

---

## My honest take

**Mess Hall** is the safest and fastest path to a working game. The theme slots naturally into the Little Sylly tone, the vocabulary is effortless, and the five plan names give you instant flavour without needing to build a whole world. If you want to add this game in Phase 22 and ship it confidently, start here.

**Walk the Plank** is the one I'd play. The pirate theme has energy, the vocabulary is punchy, and The Plank mechanic is the most dramatic of the three. It also gives you the most distinctive visual design opportunity.

**Opening Night** is the dark horse. The Note mechanic is genuinely original — no other Resistance clone has anything like it — and the five-act structure gives the game a narrative shape that the other two don't have. It needs the most creative investment but would be the most memorable.

**My actual suggestion:** Take the thematic shell of **Walk the Plank** (strong identity, great vocabulary) and swap in **The Note** mechanic from **Opening Night** (the genuinely original addition). Call it something that combines maritime and communication — private signal, secret channel, the flag code. That combination gives you the best of both.

But these are your games. All three work. What do you want to play?
