# New Game Brief — You're Uninvited
**Document type:** Phase 1 — Design Brief
**Version:** v0.2 — incorporating owner feedback from session
**Status:** Ready for review and iteration

> **On the title**
> "You're Uninvited" is the current preference. One alternative worth considering alongside it:
> **"Rain Check"** — the polite brush-off, sounds harmless, immediately reads as group-chat energy.
> Both work. Everything else in this brief uses "You're Uninvited" as the working title.

---

## 1. Identity

| Field | Answer |
|-------|--------|
| **Full game name** | You're Uninvited |
| **Short ID / abbreviation** | `yui` |
| **One-sentence tagline** | Three options — pick one or rewrite: (A) *"Every group has a Flake. Yours has two."* (B) *"Making plans is easy. Keeping them is the problem."* (C) *"They said they'd be there."* |
| **Thematic universe** | A group of friends trying to organise plans — a subset of them are quietly, repeatedly, mysteriously wrecking it. The social paranoia of a group chat where trust is eroding one bailed plan at a time. |
| **Emoji / icon** | 💬 |
| **Brand colour** | `yellow-500` — warm, sunny, joy-of-friends energy. From the Flake's perspective it reads as caution. Distinct from all existing game colours. *(If yellow feels too bright, `sky-500` is the fallback — loyal, trustworthy, group-chat blue.)* |

---

## 2. The Players

| Field | Answer |
|-------|--------|
| **Player count range** | 5–10 |
| **Teams or individuals?** | Two hidden teams. Flakes know each other; Friends know only their own role. |
| **Roles** | Yes — see table below |
| **Hidden information?** | Yes — Flakes see each other's names at game start. Friends see nothing about anyone else. In Drama Mode: one Friend also knows one Flake's identity (see §7). |
| **Minimum meaningful player count** | 5 — tight but works. 6 is the sweet spot. |

### Roles

| Role | Display name | What they know | What they do | Goal |
|------|-------------|---------------|--------------|------|
| Loyal player | **Friend** | Their own role only | Nominate, vote, and always submit "I'm In" on plans | Get 3 plans to succeed |
| Traitor | **Flake** | Their role + the names of all other Flakes | Nominate, vote, and choose to submit "I'm In" or "I Bailed" | Ruin 3 plans without being caught |
| Sylly Mode only | **[The Merlin role — see §7]** | Their own Friend role + the name of every Flake | Same as a Friend, but steers nominations carefully | Help Friends win — but stay hidden |

### Friend / Flake counts (The Resistance standard)

| Players | Friends | Flakes |
|---------|---------|--------|
| 5 | 3 | 2 |
| 6 | 4 | 2 |
| 7 | 4 | 3 |
| 8 | 5 | 3 |
| 9 | 6 | 3 |
| 10 | 6 | 4 |

**Notes:**
Flakes may choose to submit "I'm In" on a plan — this is a strategic option, not a rule violation. Letting plans succeed occasionally is how Flakes avoid suspicion. This is core Resistance strategy, preserved here.

The Flake role reveal moment — where Flakes silently see each other's names on screen before the phone is passed on — is the single most charged moment in the game. Design it to feel weighty.

---

## 3. The Core Loop

**In one sentence:** The current Planner nominates a task group, everyone votes on whether that group goes, and the selected group privately decides whether to actually get it done or quietly bail.

**The central tension:** The vote reveal. Every player's Approve/Reject vote is public — but the reason isn't. A Friend who votes Reject looks like a Flake protecting a bad group. A Flake who votes Approve looks like a trustworthy Friend. Every vote is evidence and a potential lie. The argument that follows the reveal is where the game lives.

**Game type:** ☑ Deduction / bluffing / social deception

**One complete round, step by step:**

1. **Plan announced.** All players see which plan this is (name, emoji, and how many people are needed for the task). The current Planner is named.

2. **Planner nominates.** The Planner's device is active. They tap player names to build the task group. All other devices show the nominations being made live. When the Planner confirms, nominations are locked.

3. **Everyone votes simultaneously.** All players see the nominated group and submit privately: **"I'm In"** (approve) or **"Not Them"** (reject). After submitting, a pending overlay covers the device — no one sees their own vote until all votes are in. When the last vote is submitted, all votes reveal at once.

4. **Vote result.** Each player's vote is shown publicly. If majority approved (ties = rejection): plan proceeds. If rejected: the vote rejection dot is added to the Vote Track, and the Planner role passes clockwise to the next player for a fresh nomination of the same plan. **If 5 consecutive nominations are rejected for the same plan: Flakes win immediately.** No exceptions.

5. **Task executes.** Only nominated players are active. Each submits privately: **"I'm In"** (succeed) or **"I Bailed"** (sabotage). Friends can only submit "I'm In." Flakes choose. After all nominated players submit, results are revealed simultaneously.

6. **Plan result.** The total number of "I Bailed" cards is shown — count only, not who. One bail = plan fails (with one exception — see §12). The Plan Track updates with a ✅ or ❌. A rotating excuse phrase appears for flavour (see §8.1).

7. **Planner rotates.** The Planner role passes clockwise (from initial random selection). The next plan begins from step 1. Vote Track dots reset for the new plan.

**Simultaneously or sequential?**
- Voting (step 3): truly simultaneous — all players vote at the same time on their own device
- Mission cards (step 5): truly simultaneous — nominated players submit privately at the same time
- In pass-the-phone fallback: both phases become sequential with a privacy screen overlay between each submission

**Phone handling:**
Designed for individual devices (multiplayer-first — see §10). Pass-the-phone fallback is available but cumbersome; each vote and each mission card requires a private screen-pass.

---

## 4. Winning

| Field | Answer |
|-------|--------|
| **How does a game end?** | When one side reaches 3 plan outcomes in their favour: 3 ✅ (Friends win) or 3 ❌ (Flakes win). Or: 5 consecutive rejections on a single plan (Flakes win immediately). Game ends the moment the third token is placed — the fifth plan is never played if a side has already won. |
| **How is the winner determined?** | Team result: Friends or Flakes win as a group. No individual scoring — see §5. |
| **Drama Mode exception:** | After Friends win 3 plans, Flakes get one chance to identify The [Merlin role] — see §7. If they guess correctly, Flakes win instead. |
| **Ties possible?** | No — the game always ends 3-0, 3-1, or 3-2 for one side. |
| **How long?** | 20–35 minutes. Faster with experienced players. Longer when arguments run hot — which is ideal. |

---

## 5. Scoring

**No individual scoring.** This is a team win/lose game. The result is: Friends won, or Flakes won.

The final screen names both teams and reveals all roles. No points, no rankings. The conversation after the reveal is the payoff.

---

## 6. Settings

No settings screen. Group size is handled at player setup (pass-the-phone) or lobby (multiplayer). All other rules — including the double-bail rule for Plan 4 at 7+ players — are fixed behaviours explained in How to Play.

**The one display note at player entry:** As the host enters player count or player names, show: *"X Flakes will be assigned"* as a live preview. Include a [?] tap that shows the full Friends/Flakes table from §2.

---

## 7. Drama Mode (Sylly Mode) — "Someone Always Knows"

| Field | Answer |
|-------|--------|
| **Thematic name** | Drama Mode |
| **In one sentence** | One Friend secretly knows who all the Flakes are — but if the Flakes figure out who that is, they win even after losing. |
| **Does it add new screens?** | No — the special role's extra information appears on their role reveal. The Flake identification vote at game end uses the existing end-of-game screen. |
| **Does it change scoring?** | No scoring in this game. |
| **Does it change the win condition?** | Yes — see below. |

### The Special Role — [Needs a Name]

One Friend is randomly assigned a special role at game start. They know everything a regular Friend knows, PLUS the names of all Flakes. Their role reveal shows this additional information.

**The Balance:** The special role helps Friends win by guiding nominations away from Flakes — but they must do this subtly. Being too obvious makes them identifiable. The Flakes win a "late reversal" even after losing if they correctly name this player at the end.

**Win condition change:**
- If Friends win 3 plans → before the final reveal, Flakes get one group vote: they name who they think the special role player is
- Majority vote determines the Flakes' guess
- If correct: Flakes win despite losing the plan track
- If wrong: Friends win as normal

This is the Avalon/Merlin mechanic applied directly. Confirmed balanced for base play (no additional special roles needed for v1).

### The Name — Options for the Special Role

The personality archetype: someone who knows what's really going on, quietly steers things in the right direction, doesn't take credit, makes sure everyone has a good time. The person who "holds the group together."

Three options — each has a slightly different flavour:

| Option | Name | Why it works | Why it might not |
|--------|------|-------------|-----------------|
| A | **The Anchor** | Grounding, steady, holds the group — the Flakes want to "cut loose" from them | Slightly nautical, might not read immediately |
| B | **The Glue** | Holds the friend group together, everyone's first call — instantly relatable | Very common phrase, might feel generic |
| C | **The Lookout** | Watches out for the group, sees what others miss — slightly spy-adjacent but fits | Could feel too active/tactical for the warm theme |

**My recommendation: The Anchor.** It has the most resonance with the game's theme — an anchor is quiet, invisible below the surface, doing essential work. When the Flakes "cut the anchor" at the end, the group drifts. The metaphor lands.

---

## 8. Thematic Vocabulary

| Generic term | You're Uninvited calls it |
|---|---|
| Mission | **The Plan** |
| Mission team | **The Group** (for the plan) |
| Vote to approve | **"I'm In"** |
| Vote to reject | **"Not Them"** |
| Mission card: succeed | **"I'm In"** |
| Mission card: sabotage | **"I Bailed"** |
| Mission succeeds | **"We're good to go ✅"** |
| Mission fails | **"Someone bailed ❌"** |
| Traitor role | **The Flake** |
| Loyal role | **The Friend** |
| Current leader/nominator | **The Planner** |
| Plan track | **The Agenda** (the 5 plan boxes on screen) |
| Vote rejection counter | **The Vote Track** (dots below the Agenda) |
| Game over screen | **The Aftermath** |
| Roles revealed | **"The Truth Comes Out"** |
| Play again | **"We Never Learn"** *(self-aware, funny)* OR **"New Weekend"** *(fits the plans theme)* |
| Quit | **"Leave the Chat?"** |
| Settings overlay title | N/A — no settings screen |
| How to Play overlay title | **"The Group Rules 📋"** |
| Drama Mode label | **✨ Drama Mode** |

### 8.1 The Five Plans

Fixed order, non-randomised. Stakes escalate across the five plans both thematically and structurally (team sizes grow — the final plans require more of the group to commit).

| Plan # | Task name | Emoji | Stakes level |
|--------|-----------|-------|-------------|
| 1 | The Takeaway Run | 🍕 | Zero stakes. Someone just has to go grab the food order. |
| 2 | The Supply Run | 🛒 | A bit more effort. Drinks, snacks, the works — for the whole night. |
| 3 | The Setup Crew | 🎂 | Time pressure now. Decorating and setting up before the guest of honour arrives. |
| 4 | The Booking | 🏠 | Real money. Locking in the holiday house — someone's card is going down. |
| 5 | The Big Night | 🎉 | Everything on the line. The main event. Everyone needs to show up and actually do their part. |

### 8.2 Rotating Excuse Phrases

When a plan fails (someone bailed), instead of a generic "Mission failed" message, a rotating excuse phrase is displayed as flavour. These escalate in absurdity as the plans escalate in stakes. Shown on the plan result screen — one phrase drawn randomly from the appropriate tier.

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

These phrases are hardcoded as constants in the plugin — not a separate data file (30 phrases total doesn't warrant a JSON file). One phrase is drawn randomly from the plan's tier on each failed plan result.

---

## 9. Word Bank & Content

| Field | Answer |
|-------|--------|
| **Uses `words.json`?** | No |
| **New data file needed?** | No — the excuse phrases are hardcoded constants in the plugin (~30 phrases). The five plan names are also hardcoded. |
| **Content type** | Fully social — the players are the content. |

This is the first Little Sylly game with zero word bank. Everything is generated by the players themselves.

---

## 10. Multiplayer Classification

| Field | Answer |
|-------|--------|
| **Individual devices or shared?** | **Individual devices — multiplayer-first.** This is the first game in the box designed with multiplayer as the primary experience. Pass-the-phone is the fallback, not the default. |
| **Private information?** | Yes — two types: (1) Role reveal at start (Flakes see each other; Friends see only their own role). (2) Mission card submission (private per nominated player — only the count is revealed). |
| **Simultaneous actions?** | Yes — both voting and mission card submission are simultaneously private then simultaneously revealed. This is the `readyCheck` matrix pattern. |
| **Locked devices during phases?** | Non-nominated players during mission phase: their device shows a "Waiting..." state — they can see the plan is in progress but the action area is inactive. Voting phase: all devices active. |
| **Pass-the-phone fallback?** | Yes — functional but cumbersome. Each vote and each mission card requires the phone to be passed privately around the table. Role reveal already works pass-the-phone. |

**Architecture note:** Because this game is multiplayer-first, the mode selection screen (`screen-yui-mode`) leads to either the multiplayer lobby or the pass-the-phone setup. The multiplayer version is the design gold master — the pass-the-phone version is the port.

---

## 11. Screens — Plain English List

This game is designed around a single persistent "command centre" main screen (see §12 for sketch description). Most of the game happens on this one screen. Fewer distinct screens than other Little Sylly games.

1. **Game menu** — title, tagline, How to Play, Drama Mode toggle, Back to the Box. No standalone Settings screen.
2. **Player setup** — names entered one by one, with live "X Flakes will be assigned" counter and [?] reference table. (In multiplayer: the lobby replaces this screen.)
3. **Role reveal** — each player privately sees their role. Friends see just their role. Flakes see their role + the other Flakes' names. In Drama Mode: The Anchor sees their role + all Flakes' names. Passed phone-to-phone (or simultaneous on individual devices).
4. **The Main Screen** — the persistent game board (see §12). Used for the entire game: nomination, voting, mission execution, result reveal, and plan advancement all happen here via the contextual action area. This screen does not change — its elements update.
5. **The Aftermath** — game end screen. Shows final Agenda (all 5 plans with ✅/❌), team result (Friends won / Flakes won). In Drama Mode: before role reveal, shows the Flakes' identification vote if applicable.
6. **Role reveal at end** — all roles revealed with names. Flakes shown in the game's accent colour. Friends in neutral.

---

## 12. Design Notes & Open Questions

### The Main Screen — Command Centre Vision

The owner has sketched the core idea. Description below for Claude Code reference:

**Left/main area — always visible:**
- **Name & Role tag** (top): this player's name and their role. Visible to them only — not a public display.
- **The Agenda (Plan Track)**: 5 boxes in a row. Past plans show ✅ or ❌. Current plan shows a "!" or pulse indicator. Future plans show empty. Tapping a past or current plan box opens the Plan Detail panel.
- **The Vote Track**: 5 dots below the Agenda. Shows how many nominations have been rejected for the *current* plan only. Resets when a new plan begins. Three filled dots means the group has rejected 3 nominations — two more and Flakes win automatically.
- **Action Area** (bottom section): context-sensitive. Shows different UI depending on the current game phase:
  - *Planner's device, nomination phase:* player list to tap and select. Others see: "Waiting for [Planner] to build the group..."
  - *Voting phase (all devices):* "I'm In" / "Not Them" buttons. After submission: pending overlay covers the action area until all votes are in.
  - *Mission phase, nominated players:* "I'm In" / "I Bailed" buttons. Non-nominated: "Waiting for the group..."
  - *Result phase (all devices):* shows plan outcome + rotating excuse phrase. Advances to next plan after a beat.

**Plan Detail panel (tap to reveal, overlay):**
- Triggered by tapping the current plan box on the Agenda
- Shows: Plan name + emoji, list of nominated players, vote history for this plan (all previous nomination attempts and their vote breakdown)
- Coloured accent on failure to indicate result without overwhelming the main screen (per owner's sketch annotation)
- Dismisses on tap-outside or a close button

**Design principle:** One screen. Elements update in place. The game does not feel like navigating between screens — it feels like watching a shared board evolve.

---

### The Plan Team Size Table

Built-in, not configurable. Follows The Resistance exactly. Must be included in the How to Play overlay. The double-bail rule for Plan 4 at 7+ players is part of this table.

| Players | Plan 1 | Plan 2 | Plan 3 | Plan 4 | Plan 5 |
|---------|--------|--------|--------|--------|--------|
| 5 | 2 | 3 | 2 | 3 | 3 |
| 6 | 2 | 3 | 4 | 3 | 4 |
| 7 | 2 | 3 | 3 | 4★ | 4 |
| 8 | 3 | 4 | 4 | 5★ | 5 |
| 9 | 3 | 4 | 4 | 5★ | 5 |
| 10 | 3 | 4 | 4 | 5★ | 5 |

★ Plan 4 requires 2 "I Bailed" cards to fail at 7+ players. One bail is not enough.

---

### Unresolved Design Questions

- **Title confirmation.** "You're Uninvited" vs "Rain Check" — need a decision before abbreviation is locked into code.

- **The Anchor name.** Three options presented in §7 — pick one, or suggest a better one.

- **Planner rotation.** Confirmed: random first planner, then clockwise from setup order. Player entry order during setup = permanent rotation order for the game.

- **Pending vote overlay.** After a player submits their vote, their device should show a "waiting" state that doesn't reveal their vote to others who might look at the screen. This is a simple overlay or greyed state. No input needed — just confirm this is the right approach.

- **The Aftermath — Drama Mode identification.** When Friends win and Drama Mode is ON, how is the Flakes' identification vote presented? Options: (A) All Flakes' devices show a private vote and submit simultaneously — same readyCheck pattern. (B) Flakes discuss openly and the host (Planner for the final plan?) submits one guess on behalf of all Flakes. Option B is simpler and more social. Recommend B — confirm.

- **Excuse phrases on successful plans.** The rotating excuses are for when a plan fails. What shows on a successful plan? Options: a short celebratory phrase ("We actually did it!" / "Somehow, it worked.") or nothing beyond "We're good to go ✅." Suggest a small rotating success phrase pool too — briefer, more celebratory.

---

### Out of Scope for v1

- Animated role reveal or dramatic flip effects
- Custom plan names (host-defined)
- Spectator mode
- Score tracking across multiple games in a session
- Any special roles beyond The Anchor in Drama Mode
- The Receipts mechanic (Planner must name a non-suspect after each failed plan) — great idea, parked for v1.1 after playtesting

---

## 13. Mood & References

| Field | Answer |
|-------|--------|
| **Real-world games** | The Resistance (direct source), Avalon (for Drama Mode Merlin balance), Among Us (the digital reference most players will reach for) |
| **Tone** | Accusatory, funny, warm underneath. Group chat energy — chaotic but affectionate. The tension is social, not threatening. The game should feel like it's *about* something real. |
| **Should NOT feel like** | A spy thriller. A war game. Anything requiring a rules explanation that takes longer than two minutes. |
| **Emotional reference** | *"Oi dinner tonight?" / "ok where" vs "Let's catch up in 9 months"* — the exact vibe of the inspiration group chat. The game captures what happens when that trust starts to crack. |
| **Example phrases** | "Someone bailed." / "The votes are in." / "We're good to go." / "Okay but WHY did you vote Not Them?" / "It wasn't me." / "It was definitely you." |

---

## 14. Sample Round

**Setup:** 6 players, Plan 2 of 5 — The Supply Run. 3 players needed. Current Planner: Mia. 2 Flakes in the group (Sophie and Dan — only they know this).

**Roles (secret):**
- Mia: Friend (current Planner)
- Jake: Friend
- Sophie: **Flake** ← knows Dan is also a Flake
- Tom: Friend
- Priya: Friend
- Dan: **Flake** ← knows Sophie is also a Flake

---

**Plan 2 announced.** All devices show: *"Plan 2: 🛒 The Supply Run — Mia is planning. She needs 3 people."*

**Nomination.** Mia's action area is active. She taps herself, Jake, Sophie. Taps "That's the group." All other devices update to show the nomination.

**Voting.** All six devices show the nominated group and the two buttons. Players submit privately.
- Mia: I'm In
- Jake: I'm In
- Tom: Not Them *(Tom is suspicious of Sophie after Plan 1)*
- Priya: I'm In
- Dan: I'm In ← *(Dan votes to approve his fellow Flake)*
- Sophie: I'm In ← *(Sophie votes to approve herself)*

After all votes submitted, pending overlays drop simultaneously. Result: 5 In, 1 Not Them. **Approved.** Vote breakdown visible — Tom's lone rejection is public.

*"Tom, why Not Them?" / "I don't trust Sophie." / "Sophie, seriously?" / "I voted myself onto the group, why would I bail my own run?" / "That's exactly what a Flake would say." / "..."*

**Mission execution.** Mia, Jake, Sophie's devices show the action area with "I'm In" and "I Bailed." Tom, Priya, Dan see: *"Waiting for the group to decide..."*
- Mia: I'm In
- Jake: I'm In
- Sophie: **I Bailed**

Pending overlays drop. Result reveals: **1 bail.**

**Plan result.** All devices show: *"Someone bailed ❌"* and the Plan 2 box on The Agenda turns red. The excuse phrase displayed: *"Lost my keys, can't find them anywhere"*

*"CALLED IT." — Tom / "It wasn't me!" — Sophie / "There were THREE people on that run!" — Priya / "Exactly, could've been Mia or Jake." — Dan, helpfully*

**The Agenda.** Plan 1: ✅ Plan 2: ❌ Plan 3–5: empty. Vote Track resets. Planner rotates to Jake.

*Jake is now the Planner for Plan 3: 🎂 The Setup Crew. He has to decide whether validating Tom's suspicion of Sophie is worth the social cost of excluding her.*

---

**What this round illustrates:**
- Dan voted "I'm In" on Sophie's nomination — indistinguishable from a loyal Friend supporting his friend. Covering for her.
- Sophie voted herself onto the group — the boldest move, also the one that looks most innocent.
- The "I Bailed" count revealed nothing about WHO bailed — just that one person did. Tom is right but can't prove it.
- The argument following the reveal is ten times longer than the execution phase. That's the game.
