# New Game Brief — Who Did This?!
**Document type:** Phase 1 — Design Brief (draft for review)
**Status:** Draft v0.1 — for brainstorming and iteration
**Concept origin:** Concept 1 "Mess Hall" from resistance-clone-concepts.md

> **A note on the title**
> "Mess Hall" was a working title. A few alternatives worth considering before anything is locked:
> - **Who Did This?!** — accusatory, funny, immediately communicates the energy
> - **Group Chat** — says exactly what it is, very recognisable
> - **Left on Read** — has social tension built into the name, works for a game about betrayal
> - **Don't Blame Me** — defensive, immediately funny, captures the Flake's energy
> - **You're Uninvited** — punchy, slightly mean-spirited in a fun way
>
> None of these are locked. The brief uses "Who Did This?!" as a placeholder — swap it out freely when we settle on something.

---

## 1. Identity

| Field | Answer |
|-------|--------|
| **Full game name** | Who Did This?! *(working title — see note above)* |
| **Short ID / abbreviation** | `wdt` |
| **One-sentence tagline** | "Someone in this group keeps ruining everything." |
| **Thematic universe** | A group of friends trying to organise plans — someone keeps mysteriously torpedoing them. No spies, no war. Just that specific paranoia of a group chat where one person is quietly causing chaos. |
| **Emoji / icon** | 💬 |
| **Brand colour preference** | Warm rose — something between pink and red. Sitting between LI5 (`pink-500`) and DSD (`cyan-700`) on the palette — suggest `rose-500` or `red-400`. Needs checking against existing pill classes. |

---

## 2. The Players

| Field | Answer |
|-------|--------|
| **Player count range** | 5–10 |
| **Teams or individuals?** | Two hidden teams — but players don't know which team others are on. The Flakes know each other; the Friends don't know anyone's alignment. |
| **Are there different roles?** | Yes — two base roles, one optional Sylly Mode role (see §7) |
| **Is any information hidden?** | Yes — The Flakes know who the other Flakes are. The Friends know nothing beyond their own role. |
| **Minimum meaningful player count** | 5 — at 5 players there is exactly 1 Flake, which is tight but tense. 6 is the sweet spot. |

### Roles

| Role name | What they know | What they do | Their goal | Any restrictions |
|-----------|---------------|--------------|------------|-----------------|
| **The Friends** | Only their own role — they are a Friend | Nominate teams, vote on plans, decide to succeed or sabotage (always succeed) | Get 3 plans to succeed | Cannot sabotage — their mission card is always Succeed |
| **The Flake(s)** | Their own role + the names of the other Flakes | Nominate teams, vote on plans, decide to succeed or sabotage — secretly | Ruin 3 plans without being identified | Must appear to be a Friend. Cannot reveal their role. |

**How many Flakes per player count:**

| Players | Flakes |
|---------|--------|
| 5 | 1 |
| 6 | 1 |
| 7 | 2 |
| 8 | 2 |
| 9 | 3 |
| 10 | 3 |

**Notes:**
The Flake(s) see each other's names during the role reveal phase — a silent moment where they acknowledge each other privately on screen before the phone is passed on. This is the single most tense moment in the game for that role.

At 2+ Flakes, Flakes can also choose to *succeed* a mission — this is a strategic decision. Sometimes letting a plan succeed lulls the Friends into complacency. This is core Resistance strategy and is preserved here.

---

## 3. The Core Loop

**In one sentence:** The current Planner nominates friends for a plan, everyone votes whether that group should go, and the selected group secretly decides whether to make it work or quietly wreck it.

**The central tension:** The vote phase. Everyone can see who is voting Approve or Reject — but not why. A Friend voting Reject looks exactly like a Flake trying to block a trustworthy group. A Flake voting Approve looks exactly like a Friend being supportive. Every vote is a piece of evidence and a potential lie.

**Game type:** ☑ Deduction / bluffing / social deception

**One complete round, step by step:**

1. **The Planner is announced.** One player is the current Planner (rotates clockwise). Everyone can see who the Planner is.

2. **The Planner picks a group.** The Planner nominates a set number of players (including themselves if they want) to execute the current plan. The number required varies by plan and player count — shown clearly on screen. This is public — everyone sees who was picked.

3. **Everyone votes.** All players simultaneously and secretly vote **"I'm In"** (approve the group) or **"Not Them"** (reject the group). Votes are revealed simultaneously — you see each player's vote but not their reasoning. Discussion happens naturally here.

4. **Vote result:** If the majority approves, the plan proceeds. If rejected, the Planner role passes to the next player, who nominates a new group for the same plan. **If five consecutive groups are rejected for the same plan, the Flakes win automatically** — a deadlocked group is exactly what they wanted.

5. **The plan executes.** Only the nominated group participates. Each person privately and secretly submits either **"I'm In"** (succeed) or **"I Bailed"** (sabotage). Flakes can choose either — Friends can only submit "I'm In."

6. **The result is revealed.** The total number of "I Bailed" cards is shown — not who submitted them. Just the count. One bail is enough to wreck most plans (exception: the 4th plan requires 2 bails to fail at higher player counts — see §12).

7. **The plan tracker updates.** A success token or failure token is added to the progress track. If one side has 3 tokens, the game ends.

8. **The Planner role passes** to the next player clockwise. Repeat from step 1 with the next plan.

**Simultaneously or sequential?**
- Voting (step 3): truly simultaneous — all players vote at the same time on their own device
- Mission cards (step 5): truly simultaneous — selected players submit privately at the same time

**Phone handling:**
This game is designed for individual devices (multiplayer). In pass-the-phone mode, the role reveal phase passes the phone around the table privately (each player reads their role, hands it on). Voting and mission phases pass the phone around the table for each player to submit privately, then reveal together.

---

## 4. Winning

| Field | Answer |
|-------|--------|
| **How does a game end?** | When one side achieves 3 plan outcomes in their favour — either 3 successes (Friends win) or 3 failures (Flakes win). Or: 5 consecutive rejected team nominations for a single plan (Flakes win automatically). |
| **How is the winner determined?** | Team result: Friends or Flakes. Individual scoring sits on top — see §5. |
| **Are ties possible?** | No — the game ends at exactly 3-0 or 3-1 or 3-2 for one side. The fifth plan is never played if a side has already won. |
| **How long does a game take?** | 20–35 minutes. Shorter with experienced players, longer when arguments break out (which is good). |

---

## 5. Scoring

This is the main design challenge — The Resistance has no individual scoring, just team win/lose. Little Sylly games need individual scores and a winner. The solution: individual scores are awarded based on team outcome AND personal performance, so even losers can place well if they played smart.

| What happened | Who scores | Points | Notes |
|--------------|-----------|--------|-------|
| Friends win the game | All Friends | +3 each | Base team bonus |
| Flakes win the game | All Flakes | +5 each | Flakes get more because they're outnumbered — winning is harder |
| You were on a successful plan team | You (Friend or Flake who chose Succeed) | +1 | Rewards participation on winning missions |
| You were on a failed plan team and you're a Flake | You | +2 | Rewards successful sabotage specifically |
| You correctly identified a Flake (Post-Mortem vote — see below) | You (Friend only) | +1 per correct identification | Rewards deduction — see §12 for Post-Mortem mechanic |
| You are a Flake and were NOT identified | You | +2 | Rewards staying hidden |
| You are the Organiser (Sylly Mode) and your bonus condition is met | You | +2 | See §7 |

**Balance check:**
A Friend who wins and spots a Flake can score up to 7 points. A Flake who wins and stays hidden scores 7 points. A Friend who loses scores 0 base but can still score 1–2 points from the Post-Mortem. The scoring keeps everyone engaged to the end regardless of game result.

**The Post-Mortem vote (end-of-game individual deduction):**
After the game result is determined, before roles are revealed, every Friend gets one vote — they privately name who they think a Flake is. Votes are revealed simultaneously. Correct identifications score +1. Then all roles are revealed. This is fast (30 seconds) and gives the Friends a last moment of agency even in defeat.

**No points for Flakes on the Post-Mortem** — they already know who's who.

---

## 6. Settings

| Setting | What it changes | Options | Default |
|---------|----------------|---------|---------|
| **Group Size** | Number of players | 5 / 6 / 7 / 8 / 9 / 10 | 6 |
| **Double Bail Rule** | Whether the 4th plan requires 2 sabotages to fail (standard Resistance rule for larger groups) | ON / OFF | ON |
| **Finger Pointing** | Adds a mid-game elimination vote after the 3rd failed plan — see §12 | ON / OFF | OFF |
| **Post-Mortem Bonus** | Whether the end-game identification vote awards points | ON / OFF | ON |
| ✨ **Sylly Mode — "Drama Mode"** | Adds The Organiser special role + the Receipts mechanic | OFF / ON | OFF |

**Notes on Group Size setting:**
This is unusual — most Little Sylly games derive player count from name entry during setup. Here it should be set upfront because it determines how many Flakes are assigned. The setup screen should show "X Flakes will be assigned" as a live preview as the number is adjusted, so the host understands what they're committing to before names are entered.

**Double Bail Rule explanation for settings card:**
*In bigger groups (7+), the 4th plan is more forgiving — it takes two people bailing to wreck it, not just one. Keeps things fair when there are more Flakes.*

---

## 7. Sylly Mode — "Drama Mode"

| Field | Answer |
|-------|--------|
| **Thematic name** | Drama Mode |
| **In one sentence** | One Friend secretly knows a Flake's identity — but using that knowledge is dangerous. |
| **Does it add new screens?** | No new screens — the Organiser's extra information is shown on their role reveal screen. The Receipts mechanic adds a text input moment after each failed plan (see below). |
| **Does it change scoring?** | Yes — The Organiser can earn a bonus +2 (see §5). |
| **Does it change the win condition?** | No. |

**The Organiser role:**
One Friend is randomly designated The Organiser at role assignment. They see everything a normal Friend sees, plus the name of exactly one Flake. They win the +2 bonus if: the game ends, the Friends correctly identify that Flake in the Post-Mortem vote (majority vote, not just one player), AND The Organiser themselves was never rejected from a plan team by majority vote. The last condition creates risk — if The Organiser is too obvious about steering nominations away from their known Flake, they draw attention and get excluded, losing their bonus.

**The Receipts mechanic:**
After each failed plan, before the next Planner is announced, the current Planner must publicly name one player they *don't* suspect — a statement on record. This creates a trail of evidence across the game. No mechanical effect — it's purely social. But by plan 4 or 5, players are calling back to earlier statements: "You said you didn't suspect Jess after Plan 2 and Jess just bailed." Very funny, very tense.

The Receipts statement is typed into the phone (short, max 60 chars) and displayed on everyone's screen simultaneously. It is stored in the plan history log.

---

## 8. Thematic Vocabulary

| Generic term | This game calls it |
|---|---|
| Round | **The Plan** (e.g. "Plan 1 of 5") |
| Mission | **The Plan** |
| Mission team | **The Group** |
| Mission success | **It's Happening ✅** |
| Mission failure | **Someone Bailed ❌** |
| Vote to approve | **"I'm In"** |
| Vote to reject | **"Not Them"** |
| Mission card: succeed | **"I'm In"** |
| Mission card: sabotage | **"I Bailed"** |
| Traitor / spy | **The Flake** |
| Loyal player | **The Friend** |
| Current leader / nominator | **The Planner** |
| Progress track | **The Scoreboard** (shows plan tokens — ✅ and ❌) |
| Game over screen | **The Post-Mortem** |
| Winner | **Most Reliable Friend** / **Master Flake** (role-dependent) |
| Play again | **New Group, Same Drama** |
| Quit | **Leave the Chat?** |
| Settings overlay title | **The Group Rules 📋** |
| Sylly Mode label | **✨ Drama Mode** |
| The five plans (names) | See below |

**The Five Plans:**

| Plan # | Name | Flavour |
|--------|------|---------|
| 1 | 🍕 The Takeaway Order | Low stakes. Someone always wants something different. |
| 2 | 🏖️ The Weekend Away | Requires coordination. Cracks start showing. |
| 3 | 🎂 Someone's Surprise Party | The one that really matters. Can't be undone. |
| 4 | 🎄 The Family Gathering | Everyone's already stressed. This is where it unravels. |
| 5 | 💍 The Big Occasion | Everything on the line. Whatever this is, it's important. |

The plan names are flavour only — no mechanical difference between them except player counts per plan (which follow the standard Resistance table). They should appear as headings on the plan execution and result screens.

---

## 9. Word Bank & Content

| Field | Answer |
|-------|--------|
| **Does this game use `words.json`?** | No |
| **What kind of content does it need?** | None beyond player names and plan names. The game generates no prompts and draws no words — the content IS the players themselves. |
| **Does it need a new data file?** | No — the five plan names are hardcoded strings, not drawn from a data file. |
| **Any exclusions?** | N/A |

This is the first Little Sylly game with no word bank at all. The content is entirely social — the players are the prompts.

---

## 10. Multiplayer Classification

| Field | Answer |
|-------|--------|
| **Individual devices or shared?** | Individual devices — this is the game that most demands multiplayer. The voting and mission card phases are designed to be private. Pass-the-phone works but is cumbersome and partially defeats the purpose (passing 6 phones around a table to vote is fine; it's done in the physical game with cards). |
| **Private information?** | Yes — two types: (1) Role reveal at game start (Flakes see each other's names; Friends see nothing extra). (2) Mission card submission (each nominated player's bail/succeed choice is private — only the count is revealed). |
| **Simultaneous actions?** | Yes — two phases: voting (all players vote simultaneously) and mission cards (all nominated players submit simultaneously). |
| **Locked devices?** | During voting and mission phases, non-nominated players' devices show a "Waiting..." state — they can see the vote is in progress but can't interact. This is the `readyCheck` matrix pattern. |
| **Roles that don't work with multiple devices?** | None — every phase maps cleanly onto individual devices. The role reveal phase (which in pass-the-phone requires private viewing) is handled automatically in multiplayer. |

**This game is the clearest argument for multiplayer being a first-class feature.** The physical game's biggest UX friction is the mission card phase — physically shuffling cards before reveal, maintaining secrecy in a small room. Individual devices solve this entirely.

---

## 11. Screens — Plain English List

1. **Game menu** — title, tagline, play CTA, how to play, settings, back to the box
2. **Setup** — player names entered one by one (or imported from lobby in multiplayer). Group Size setting confirmed here if not already set.
3. **Role reveal** — each player privately reads their role. For Flakes: their name + the names of the other Flakes displayed discreetly. For Friends: just their role. Phone is passed around the table. (In multiplayer: each player's own device shows this simultaneously.)
4. **Plan announcement** — shows which plan number this is (name + emoji), how many players are needed, and who the current Planner is. All players see this at once.
5. **Nomination** — the Planner's screen: they tap player names to select their group. Shows live count of how many more they need to pick.
6. **Voting** — all players simultaneously see the nominated group and submit their vote (I'm In / Not Them). In pass-the-phone: phone goes around, each player votes privately, then all votes revealed at once.
7. **Vote result** — shows each player's vote (Approve/Reject) and the outcome. If rejected, shows who the next Planner is. If approved, proceeds to execution.
8. **Mission execution** — only nominated players interact. Each submits their private card (I'm In / I Bailed). In pass-the-phone: phone goes around the nominated group only.
9. **Plan result** — the count of bails is revealed (e.g. "1 person bailed"). The plan success or failure is announced. Progress track updates visually. Short, punchy screen.
10. **History / scoreboard** — visible between plans. Shows all plan outcomes so far (✅ ❌), who the Planner was for each, and who was on each group. Receipts statements also appear here in Drama Mode.
11. **Post-Mortem vote** — after game ends, before role reveal. Each player privately votes: who do they think is a Flake? Votes submitted simultaneously.
12. **Role reveal / game over** — all roles revealed. Individual scores tallied. Winner(s) announced. The Post-Mortem vote results shown alongside who was actually a Flake.

---

## 12. Open Questions & Design Notes

**Unresolved design questions:**

- **The game title.** "Who Did This?!" is a placeholder. Need to pick one before the technical spec is written since it affects the abbreviation, pill class, and all vocabulary. The options from the preamble are all on the table.

- **The "Double Bail" player count threshold.** Standard Resistance uses the 4th mission requiring 2 fails for 7+ players. Do we want to follow this exactly, or simplify to "always 1 bail = failure" for a more accessible game? The double-bail rule adds strategic depth but requires explanation. Recommend keeping it but making it a setting (default ON) so groups can simplify if they want.

- **The Finger Pointing setting.** After the 3rd failed plan, a binding vote to eliminate one player and reveal their role. This is dramatic and fun but adds a Werewolf-style layer that changes the game significantly. Key questions: (a) Does the eliminated player keep playing in some capacity, or are they fully out? (b) Can the elimination target a Friend (meaning the Friends accidentally eliminate one of their own)? Recommend: yes to both — eliminated player is out of nominations and voting but stays at the table, and yes Friends can shoot themselves in the foot. But this needs confirmation.

- **How the Planner rotation works.** In standard Resistance, it goes clockwise in player-number order regardless of who is on missions. This is fine for pass-the-phone but needs to be locked into the setup order for multiplayer. The setup screen order of name entry = the Planner rotation order.

- **Post-Mortem vote: how many Flakes can each player name?** Option A: each player names exactly one person they suspect. Option B: each player can name up to [number of Flakes] people. Option A is simpler and faster. Option B rewards tracking multiple suspects. Recommend Option A for v1.

**Things that might be complicated to implement:**

- The simultaneous voting reveal is the most technically interesting phase — all players submit privately and the reveal happens together. This is the core `readyCheck` matrix pattern but the UX of "everyone hold your phone face down until we all see the result together" needs careful design even in multiplayer.

- The Flake role reveal showing *other Flakes' names* requires targeted private data delivery — each Flake's device shows different information at game start. This is the Firebase targeted write pattern from MFS v1.4.

- The history/scoreboard screen (screen 10) needs to be accessible mid-game as a reference. This could be an overlay rather than a full screen — decision for the technical spec.

**Things explicitly OUT OF SCOPE for v1:**

- Animated role reveal (e.g. a dramatic "card flip" animation for the role)
- Custom plan names or the ability to add your own events
- Spectator mode (a player who can see everything but can't vote — could be interesting for teaching new players)
- Any special roles beyond The Organiser in Sylly Mode
- Score tracking across multiple games in a session

**General notes:**

The Receipts mechanic in Drama Mode (§7) requires a text input and a persistent display. The statement is shown to all players simultaneously, stored in the plan history, and referenced at game end. This is the LTTP message mechanic in miniature — the technical pattern already exists in the codebase. Max 60 characters. No content validation needed (it's a social game — players self-police).

The five plan names are fixed and non-randomised — Plan 1 is always The Takeaway Order, Plan 5 is always The Big Occasion. This is intentional: the escalating stakes feel more meaningful if everyone knows what's coming.

---

## 13. Mood & References

| Field | Answer |
|-------|--------|
| **Real-world games** | The Resistance (direct source), Werewolf / Mafia (same social deduction DNA), Among Us (the digital equivalent most people already understand) |
| **Tone** | Accusatory, funny, warm underneath. Think group chat energy — chaotic but affectionate. The tension is social, not threatening. |
| **Should NOT feel like** | A spy thriller. A serious strategy game. Anything that requires a rule book to enjoy. |
| **Example phrases / copy** | "Someone in this group keeps ruining everything." / "The votes are in." / "One person bailed." / "Nobody bailed — it's happening!" / "Okay but WHY did you vote Not Them on that one?" |

---

## 14. Sample Round

**Setup:** 6 players. Plan 2 of 5 — The Weekend Away. 1 Flake in the group. Requires 3 players on the group. Current Planner: Mia.

**Roles (secret):**
- Mia: Friend (current Planner)
- Jake: Friend
- Sophie: **Flake**
- Tom: Friend
- Priya: Friend
- Dan: Friend

---

**Step 1 — Plan announcement:** All screens show "Plan 2: 🏖️ The Weekend Away — Mia is planning. She needs to pick 3 people."

**Step 2 — Nomination:** Mia's device is active. She taps herself, Jake, and Sophie. She taps "That's the group."

**Step 3 — Voting:** All six devices show: "Mia's group: Mia, Jake, Sophie. Are you in?"
- Mia: I'm In
- Jake: I'm In
- Tom: Not Them *(Tom is suspicious of Sophie from Plan 1's bail result)*
- Priya: I'm In
- Dan: I'm In
- Sophie: I'm In *(Sophie votes to approve her own group — classic)*

**Vote result:** 5 In, 1 Not Them. Approved. All screens show each person's vote simultaneously. Tom's lone Reject is visible — Tom has to explain himself.

*"Tom, why Not Them?" / "I don't trust Sophie." / "Sophie, any thoughts?" / "That's insane, I voted In on my own group, why would I..."*

**Step 4 — Execution:** Only Mia, Jake, and Sophie receive the prompt. Tom, Priya, and Dan see "Waiting for the group to decide..."
- Mia: I'm In
- Jake: I'm In
- Sophie: **I Bailed**

**Step 5 — Plan result:** All screens show: "The Weekend Away: ❌ Someone bailed. (1 bail)" The failure token is added to the track. Friends: 1 success, 1 failure. Flakes: 1 failure.

*"CALLED IT." — Tom / "It wasn't me!" — Sophie / "You voted yourself onto that group!" — Priya / "So?" — Sophie*

**Step 6 — Planner passes to Jake** (next clockwise). Plan 3 is announced: 🎂 Someone's Surprise Party.

---

**What this round demonstrated:**
- Sophie played well — voting herself onto a group looks innocent
- Tom was right but couldn't prove it
- The post-bail discussion is the entire game — the execution took 10 seconds, the argument will last 3 minutes
- Jake is now the Planner and has to decide whether to include Sophie or validate Tom's suspicion
