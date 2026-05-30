# New Game Brief — Bailed
**Document type:** Phase 1 — Design Brief
**Version:** v0.3 — final pre-implementation polish
**Status:** Parked pending Phase 21a + 21b (MFS). Revisit before writing technical spec.

> ⚠️ **MFS Revisit Required**
> This brief was written before multiplayer implementation. Before converting to a technical spec, the following sections must be reviewed against the completed MFS v1.4:
> - §10 (Multiplayer Classification) — confirm readyCheck matrix pattern, Firebase targeted writes for role reveal, simultaneous vote reveal mechanics
> - §11 (Screens) — the "Tap to Reveal" pass-gate design may be simplified or replaced by individual device handling in multiplayer mode
> - §12 (Pass-gate mandate) — single-device only; multiplayer handles vote privacy natively on individual screens
> Do not begin the technical spec until MFS v1.4 is implemented and confirmed.

---

## On the Title

**Recommended: "Bailed"**
Short, instantly understood, works as both verb (*they bailed*) and past tense descriptor (*the plan got bailed*). Names the core drama without explaining it.

Close second: **"Flaked"** — same energy, directly tied to the role name ("The Flake"). Slightly more on-the-nose, which cuts both ways.

Further options if neither lands:
- **Half-Baked** — baked/bailed pun, slightly longer but funny
- **No-Show** — descriptive, punchy, universally understood
- **Rain Check** — sounds harmless, retroactively darkly funny once you've played it

This brief uses **Bailed** throughout. Short ID: `bld`. If "Flaked" wins, short ID becomes `flk`. Lock the title before the technical spec is written — the abbreviation gets baked into every variable and screen ID.

---

## 1. Identity

| Field | Answer |
|-------|--------|
| **Full game name** | Bailed |
| **Short ID / abbreviation** | `bld` |
| **One-sentence tagline** | *"Every group has a Flake. Yours has two."* |
| **Thematic universe** | A group of friends trying to organise plans. A subset of them are quietly, repeatedly, mysteriously wrecking it. The social paranoia of a group chat where trust erodes one bailed plan at a time. Not just one person — a small faction of them, coordinated. |
| **Emoji / icon** | 💬 |
| **Brand colour** | `yellow-500` — warm, sunny, friends-and-joy energy on the surface. Reads as caution from the Flake's perspective. Distinct from all existing game colours. Fallback: `sky-500` (loyal, trustworthy, group-chat blue) if yellow is too close to existing UI elements. |

---

## 2. The Players

| Field | Answer |
|-------|--------|
| **Player count range** | 5–10 |
| **Teams or individuals?** | Two hidden teams. Flakes know each other; Friends know only their own role. |
| **Roles** | Two base roles (Friend, Flake). One optional Drama Mode role (The Pot-Stirrer — see §7). |
| **Hidden information?** | Flakes see each other's names at game start. Friends see nothing about anyone else's alignment. In Drama Mode: The Pot-Stirrer also sees all Flake names. |
| **Minimum meaningful count** | 5. Tight but functional. 6 is the sweet spot for couch play. |

### Roles

| Role | Display name | What they know | What they do | Goal |
|------|-------------|---------------|--------------|------|
| Loyal player | **Friend** | Their own role only | Nominate, vote, always submit "I'm In" on plans | Get 3 plans to succeed |
| Traitor | **Flake** | Their role + all other Flakes' names | Nominate, vote, choose "I'm In" or "I Bailed" on plans | Ruin 3 plans undetected |
| Drama Mode only | **The Pot-Stirrer** | Their Friend role + all Flakes' names | Same as Friend — but steers nominations carefully without drawing attention to themselves | Help Friends win — while staying hidden |

Flakes may choose to submit "I'm In" on a plan — letting plans succeed is a strategic option to avoid suspicion, not a rule violation. Core Resistance strategy, preserved.

### Friend / Flake counts (The Resistance standard)

| Players | Friends | Flakes |
|---------|---------|--------|
| 5 | 3 | 2 |
| 6 | 4 | 2 |
| 7 | 4 | 3 |
| 8 | 5 | 3 |
| 9 | 6 | 3 |
| 10 | 6 | 4 |

---

## 3. The Core Loop

**In one sentence:** The current Planner nominates a task group, everyone votes on whether that group goes, and the selected group privately decides whether to actually get it done or quietly bail.

**The central tension:** The vote reveal. Every player's Approve/Reject vote is public — but the reason isn't. A Friend who votes Reject looks exactly like a Flake protecting a compromised group. A Flake voting Approve looks exactly like a trustworthy Friend. Every vote is evidence and a potential lie. The argument that follows the reveal is where the game lives.

**Game type:** ☑ Deduction / bluffing / social deception

**One complete round, step by step:**

1. **Plan announced.** All players see which plan this is (name, emoji, how many people needed). The current Planner is named.

2. **Planner nominates.** The Planner selects the task group. All other players can see who is being nominated. When confirmed, nominations lock.

3. **Everyone votes simultaneously** (or sequentially in pass-the-phone — see §12). All players submit privately: **"I'm In"** (approve) or **"Not Them"** (reject). After submitting, a pending state covers the action area — no one sees anything until all votes are in. All votes reveal at once.

4. **Vote result.** Each player's vote is shown publicly. Majority approves → plan proceeds. Majority rejects (ties = rejection) → a rejection dot is added to the **Patience Meter**, the Planner role passes clockwise for a fresh nomination of the same plan. **If 5 consecutive nominations are rejected for the same plan: Flakes win immediately.**

5. **Task executes.** Only nominated players act. Each submits privately: **"I'm In"** (succeed) or **"I Bailed"** (sabotage). Friends can only submit "I'm In." Flakes choose freely.

6. **Plan result.** The count of "I Bailed" cards is revealed — count only, never who. One bail = plan fails (exception: Plan 4 at 7+ players requires 2 bails — see §12). The Agenda updates with ✅ or ❌. A rotating phrase appears for flavour (see §8.1).

7. **Planner rotates clockwise.** Patience Meter resets. Next plan begins.

**Phone handling:** Multiplayer-first (individual devices). Pass-the-phone fallback available — but every phase requiring private input requires a mandatory "Tap to Reveal" pass-gate (see §12).

---

## 4. Winning

| Field | Answer |
|-------|--------|
| **How does a game end?** | One side reaches 3 plan outcomes in their favour: 3 ✅ (Friends win) or 3 ❌ (Flakes win). Or: 5 consecutive rejected nominations on a single plan (Flakes win immediately, regardless of plan track). |
| **How is the winner determined?** | Team result. No individual scoring. |
| **Drama Mode exception** | After Friends win 3 plans, Flakes get one chance to identify The Pot-Stirrer. If correct, Flakes win the game despite losing the plan track. See §7. |
| **Ties possible?** | No. Game always ends 3-0, 3-1, or 3-2 for one side. The fifth plan is never played if a side has already won. |
| **Session length** | 20–35 minutes. Longer when arguments run hot — which is ideal. |

---

## 5. Scoring

No individual scoring. This is a team win/lose game. The result is: Friends won, or Flakes won.

The Aftermath screen names both teams, reveals all roles, and shows the final Agenda. No points. No rankings. The conversation after the reveal is the payoff.

---

## 6. Settings

No settings screen. Group size is handled at player entry (pass-the-phone) or the lobby (multiplayer). All other rules are fixed behaviours explained in How to Play.

**Player entry screen note:** As the host enters players, show a live counter: *"X Flakes will be assigned"*. Include a [?] tap to reveal the full Friends/Flakes table from §2.

---

## 7. Drama Mode (Sylly Mode) — "Someone Always Knows"

| Field | Answer |
|-------|--------|
| **Thematic name** | Drama Mode |
| **In one sentence** | One Friend secretly knows all the Flakes — but they have their own reputation to protect, so they stir the pot quietly instead of naming names. And if the Flakes figure out who they are, they win anyway. |
| **New screens?** | No. Extra information appears on the Pot-Stirrer's role reveal. The end-game Flake identification uses the existing Aftermath screen. |
| **Changes scoring?** | No scoring in this game. |
| **Changes win condition?** | Yes — see below. |

### The Pot-Stirrer

One Friend is randomly assigned as The Pot-Stirrer at role assignment. Their role reveal shows: their role name, plus the names of all Flakes — displayed discreetly, same as the Flake-to-Flake reveal.

**The character:** They know exactly who the Flakes are. But they protect their own position in the group first — they don't openly name Flakes because doing so makes them an obvious target for the Flake end-game identification vote. Instead, they steer nominations, ask pointed questions, vote strategically, and let others reach conclusions. They stir the pot. They never touch the stove.

**The balance:** The Pot-Stirrer helps Friends win — but being too obvious about it is how they lose their Drama Mode bonus even in a Friends victory. The tension between "help the group" and "don't be identified" is exactly the Merlin mechanic from Avalon. Confirmed balanced for base play without additional special roles.

### The Drama Mode End-Game Vote (Flake Identification)

This sequence only triggers when Friends win 3 plans.

1. Before any roles are revealed, one Flake is designated **The Ringleader** at game start (assigned randomly alongside roles, shown only on that Flake's role reveal). The Ringleader is the Flakes' spokesperson for this moment.

2. Flakes reveal themselves publicly to the group for the first time — a dramatic moment. They discuss openly: *"We think the Pot-Stirrer is..."*

3. The Ringleader's device shows the identification input. Instructions read: *"Discuss with your fellow Flakes, then submit your pick."* The Ringleader submits one player name — their collective guess for who The Pot-Stirrer is.

4. The guess is revealed to all. Then all roles are revealed.
   - **If correct:** Flakes win — the Friends' inside advantage was neutralised.
   - **If wrong:** Friends win as normal — The Pot-Stirrer stayed hidden.

**The Ringleader display name options** (one to confirm before technical spec):
- **The Ringleader** — implies coordination, fits the group-sabotage theme
- **The Head Flake** — more on-the-nose, consistent vocabulary
- **The OG Flake** — casual, fits the tone

Recommendation: **The Ringleader**. Signals authority within the Flake group without being crude.

---

## 8. Thematic Vocabulary

| Generic term | Bailed calls it |
|---|---|
| Mission | **The Plan** |
| Mission team | **The Group** |
| Vote approve | **"I'm In"** |
| Vote reject | **"Not Them"** |
| Mission card: succeed | **"I'm In"** |
| Mission card: sabotage | **"I Bailed"** |
| Plan succeeds | **"We're good to go ✅"** |
| Plan fails | **"Someone bailed ❌"** |
| Traitor | **The Flake** |
| Loyal player | **The Friend** |
| Current leader | **The Planner** |
| Plan progress track | **The Agenda** |
| Rejection counter | **The Patience Meter** |
| Drama Mode special role | **The Pot-Stirrer** |
| Drama Mode Flake spokesperson | **The Ringleader** |
| Game over screen | **The Aftermath** |
| Roles revealed | **"The Truth Comes Out"** |
| Play again | **"We Never Learn"** |
| Quit | **"Leave the Chat?"** |
| How to Play title | **"The Group Rules 📋"** |
| Sylly Mode label | **✨ Drama Mode** |

### 8.1 The Five Plans

Fixed, non-randomised. Stakes escalate across all five plans — thematically and structurally (team sizes grow; final plans require more commitment from the group).

| # | Task name | Emoji | Stakes |
|---|-----------|-------|--------|
| 1 | The Takeaway Run | 🍕 | Zero stakes. Someone just has to go pick up the order. |
| 2 | The Supply Run | 🛒 | A bit more effort. Drinks, snacks, the works — for the whole group. |
| 3 | The Setup Crew | 🎂 | Time pressure. Decorating and organising before the guest of honour arrives. |
| 4 | The Booking | 🏠 | Real money. Someone's card is going down for the holiday house. |
| 5 | The Big Night | 🎉 | Everything on the line. Everyone needs to actually show up and do their part. |

*Note: A larger pool of plan names (organised into five tiers by stakes level) is a v1.1 consideration — so the same group can replay without seeing the same plan names every game. Parked for now.*

### 8.2 Rotating Excuse Phrases — Plan Failures

When a plan fails, a rotating phrase is drawn randomly from the tier matching that plan's number. One phrase per fail result. Displayed on the plan result screen as flavour before the ❌ is added to the Agenda.

These are hardcoded constants in the plugin — no data file needed.

**Plan 1 tier — plausible, relatable:**
- "Slept through my alarm 🙈"
- "Not feeling it today, sorry"
- "Stuck in traffic, don't wait"
- "My phone died, just saw this"
- "Running late... maybe 20 mins?"
- "Just got out of the shower lol"

**Plan 2 tier — weak, suspicious:**
- "Something came up at work"
- "My mum needs me rn"
- "Forgot I had plans tonight 😬"
- "Car's making a weird noise"
- "Running 45 mins late... maybe an hour"
- "Actually not sure I can make it"

**Plan 3 tier — dramatic, starting to get funny:**
- "My cat got stuck in a tree"
- "Lost my keys, can't find them anywhere"
- "Grabbing coffee with someone, might be a while 👀"
- "There's a situation at home, can't explain"
- "My neighbour locked themselves out and now I'm involved somehow"
- "Long story but I'm stuck at my ex's"

**Plan 4 tier — ridiculous:**
- "There's a bird in my apartment and I genuinely cannot catch it"
- "Accidentally booked the wrong suburb on my Uber"
- "My dog ate my shoes. Both of them."
- "There's a possum on my balcony and I'm a little scared honestly"
- "Long story but I'm somehow at the airport"
- "I'm being very honest when I say I have no idea where I am right now"

**Plan 5 tier — completely unhinged:**
- "There was something in my building's elevator I cannot explain"
- "My neighbour's pet fish had an emergency. Yes really."
- "I got accidentally locked inside a shopping centre"
- "I genuinely cannot legally explain what happened"
- "You wouldn't believe me if I told you"
- "Okay so there was an elephant. At the bottle shop. I'm serious."

### 8.3 Rotating Phrases — Plan Successes

When a plan succeeds, a shorter celebratory phrase is drawn randomly. Warmer, slightly disbelieving — like the group is surprised it worked.

Hardcoded constants alongside the failure phrases.

- "A modern miracle. We actually went."
- "Everyone showed up. Frame this moment."
- "The group chat survived another day."
- "Against all odds, the vibes were immaculate."
- "No one flaked! Check the group's temperature."
- "Somehow, it all came together."
- "The Agenda thanks you for your service."

---

## 9. Word Bank & Content

| Field | Answer |
|-------|--------|
| **Uses `words.json`?** | No |
| **New data file needed?** | No — all phrase arrays (~37 excuse phrases + ~7 success phrases) are hardcoded constants in the plugin. |
| **Content type** | Fully social — the players are the content. First Little Sylly game with no word bank. |

---

## 10. Multiplayer Classification

| Field | Answer |
|-------|--------|
| **Primary mode** | **Individual devices — multiplayer-first.** This is the first game in the box designed with multiplayer as the primary experience. Pass-the-phone is the fallback port, not the design target. |
| **Private information types** | (1) Role reveal at game start — Flakes see each other's names; Friends see only their own role; Pot-Stirrer sees all Flake names. (2) Voting — private per player until simultaneous reveal. (3) Mission card submission — private per nominated player; only the count is revealed. |
| **Simultaneous actions** | Yes — voting phase and mission card phase are both simultaneously private then simultaneously revealed. readyCheck matrix pattern applies to both. |
| **Locked states** | Non-nominated players during mission phase: action area inactive ("Waiting for the group..."). Voting phase: all devices active. |
| **Pass-the-phone fallback** | Functional but long — every private input requires a mandatory pass-gate (see §12). |

> ⚠️ **MFS Revisit — §10:** Confirm readyCheck matrix behaviour, Firebase targeted writes for role reveal (Flake-to-Flake, Pot-Stirrer), and simultaneous vote reveal mechanics against MFS v1.4 §7 before writing technical spec.

---

## 11. Screens — Plain English List

This game runs on a single persistent main screen for most of its duration. Fewer distinct full-screen transitions than other Little Sylly games.

1. **Game menu** — title, tagline, How to Play, ✨ Drama Mode toggle, Back to the Box
2. **Player setup** — player names entered one by one; live "X Flakes will be assigned" counter; [?] tap for the Friends/Flakes reference table. *(Multiplayer: replaced by the shared lobby screen from MFS v1.4)*
3. **Role reveal** — each player privately sees their role card. Friends: role only. Flakes: role + fellow Flake names. Pot-Stirrer: role + all Flake names. The Ringleader: role + fellow Flake names + a small secondary label indicating they are The Ringleader (visible only to them). Mandatory pass-gate before each player's reveal in pass-the-phone mode.
4. **The Main Screen** — the persistent game board used for the entire game. All action happens here via a context-sensitive action area. See §12 for full layout description.
5. **The Aftermath** — end-of-game screen. Shows the complete Agenda (all 5 plans, ✅/❌), the team result (Friends won / Flakes won), and — if Drama Mode — the Ringleader identification sequence before roles are revealed.
6. **Role reveal at end** — all roles revealed simultaneously. Flakes displayed in the game's brand colour. Friends neutral. Pot-Stirrer shown separately if Drama Mode was on.

---

## 12. Design Notes

### The Main Screen — Command Centre Layout

The entire game lives on one persistent screen. Elements update in place. The player never navigates away mid-game.

**Always-visible elements:**
- **Name & Role tag** (top): this device's player name and their role. Private — not a public display.
- **The Agenda** (plan track): 5 boxes in a row. Past plans: ✅ or ❌. Current plan: pulsing indicator with plan name and emoji. Future plans: empty. Each box is tappable — opens the Plan Detail panel.
- **The Patience Meter** (vote rejection counter): 5 dots beneath the Agenda. Fills left-to-right as nominations are rejected for the current plan. Resets when a new plan begins. At 5 filled dots — Flakes win. The visual tension of watching this fill is part of the game.

**Context-sensitive Action Area** (bottom — changes by game phase):

| Phase | Planner's device | Other players' devices |
|-------|-----------------|----------------------|
| Nomination | Tappable player list; confirm button | "Waiting for [Planner] to build the group..." |
| Voting | "I'm In" / "Not Them" buttons | Same |
| Post-vote pending | Dimmed/covered action area | Same — all waiting |
| Vote result | Displays all votes; "Next" to proceed | Same |
| Mission (nominated) | "I'm In" / "I Bailed" buttons | "Waiting for the group..." |
| Mission (non-nominated) | "Waiting for the group..." | Same |
| Plan result | Rotating phrase + ✅/❌ + plan tracker update | Same |

**Plan Detail panel** (tap any Agenda box):
A slide-up overlay showing: plan name + emoji, task group for each nomination attempt, vote breakdown per attempt, outcome. This is the receipts screen — players will reference it mid-argument. Dismisses on tap-outside.

---

### The Pass-Gate Mandate (Single-Device / Pass-the-Phone Mode)

**This is non-negotiable.** In pass-the-phone mode, a mandatory "Tap to Reveal" pass-gate must appear before every single private action. Without it, handing the phone to the next player exposes the current player's vote or mission card — which immediately breaks the game.

**The pass-gate uses the existing `overlay-modal-inner` pattern:**

```
[Player Name]'s turn.

Don't look until it's yours.

[ Tap to Reveal ]
```

The "Tap to Reveal" button is the only interactive element. Tapping it reveals the action area for that player. The pass-gate fires:

- Before every player's **vote submission** in the voting phase (all players, every round)
- Before every nominated player's **mission card submission** in the mission phase

In multiplayer (individual devices), these pass-gates are entirely absent — privacy is handled natively by each player having their own screen.

The pass-the-phone loop for a 6-player voting phase is therefore: pass-gate → vote → submit → pending → [repeat × 6] → all votes reveal simultaneously. This is long. It is the accepted cost of single-device play for a game designed around private simultaneous action.

---

### The Plan Team Size Table

Fixed, non-configurable. Follows The Resistance standard exactly. Must appear in the How to Play overlay.

| Players | Plan 1 | Plan 2 | Plan 3 | Plan 4 | Plan 5 |
|---------|--------|--------|--------|--------|--------|
| 5 | 2 | 3 | 2 | 3 | 3 |
| 6 | 2 | 3 | 4 | 3 | 4 |
| 7 | 2 | 3 | 3 | 4★ | 4 |
| 8 | 3 | 4 | 4 | 5★ | 5 |
| 9 | 3 | 4 | 4 | 5★ | 5 |
| 10 | 3 | 4 | 4 | 5★ | 5 |

★ Plan 4 requires **2** "I Bailed" cards to fail at 7+ players. One bail is not enough.

---

### Planner Rotation

First Planner selected randomly at game start. Rotation proceeds clockwise based on player entry order during setup. Player entry order = permanent rotation order for the session.

---

## 13. Out of Scope for v1

- Animated or dramatic role reveal effects
- Custom or randomised plan names per session
- A larger pool of plan names organised by tier (v1.1)
- The Receipts mechanic (Planner must publicly nominate a non-suspect after each failed plan — excellent idea, parked for v1.1 after playtesting confirms it's needed)
- Spectator mode
- Score tracking across multiple games in a session
- Any Drama Mode special roles beyond The Pot-Stirrer and The Ringleader designation

---

## 14. Mood & References

| Field | Answer |
|-------|--------|
| **Real-world games** | The Resistance (direct source), Avalon (Drama Mode Merlin balance), Among Us (the digital reference most players will reach for) |
| **Tone** | Accusatory, funny, warm underneath. Group chat energy — chaotic but affectionate. The tension is social and recognisable. The game is *about* something real. |
| **Should NOT feel like** | A spy thriller. A war room. Anything requiring a two-minute rules explanation. |
| **Emotional reference** | *"Oi dinner tonight?" / "ok where"* vs *"Let's catch up in 9 months."* The exact energy of a friend group where the logistics are slowly killing the vibe. |
| **Example phrases** | "Someone bailed." / "The votes are in." / "We're good to go." / "Okay but WHY did you vote Not Them?" / "It wasn't me." / "It was definitely you." |

---

## 15. Sample Round

**Setup:** 6 players. Plan 2 — The Supply Run. 3 people needed. Current Planner: Mia. Drama Mode ON. Roles (secret): Mia (Friend), Jake (Pot-Stirrer — knows Sophie and Dan are Flakes), Sophie (Flake, Ringleader), Tom (Friend), Priya (Friend), Dan (Flake).

---

**Plan announced.** All devices: *"Plan 2: 🛒 The Supply Run — Mia is planning. She needs 3 people."*

**Nomination.** Mia taps herself, Jake, Sophie. Confirms. All devices update.

**Voting.** All six submit privately behind pass-gates (pass-the-phone) or on individual screens (multiplayer). Results:
- Mia: I'm In / Jake: I'm In / Tom: Not Them / Priya: I'm In / Dan: I'm In / Sophie: I'm In

Pending state drops. Votes reveal simultaneously. 5 In, 1 Not Them. **Approved.** Tom's lone rejection is public.

*"Tom, why Not Them?" / "I just... I don't love this group." / "Sophie, any response?" / "I voted myself on, why would I bail my own run?" / "That's literally what a Flake would say." [Jake says nothing, watches carefully]*

**Mission.** Mia, Jake, Sophie submit privately behind pass-gates. Tom, Priya, Dan see "Waiting for the group..."
- Mia: I'm In / Jake: I'm In / Sophie: **I Bailed**

**Result.** All devices: *"Someone bailed ❌"* — count only, no names. Excuse phrase: *"Lost my keys, can't find them anywhere."* Agenda: Plan 1 ✅ Plan 2 ❌. Patience Meter resets.

*"CALLED IT." — Tom / "It wasn't me!" — Sophie / "Three people, one bail, do the math." — Tom / "Could've been anyone." — Dan [covering] / Jake files this away silently*

**Planner passes to Jake.** Plan 3: 🎂 The Setup Crew. Jake now has to decide how much to reveal — and how obvious to make it.

---

*What this round illustrates: Dan voted I'm In on Sophie's nomination — indistinguishable from a Friend supporting his friend. Sophie voted herself onto the group — the boldest Flake move, also the most innocent-looking. The bail count revealed nothing about who. Tom is right and cannot prove it. Jake knows everything and said nothing. The argument is ten times longer than the execution. That is the game.*
