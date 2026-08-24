# New Game Brief — Template
> Copy this file, rename it `new-game-brief-[name].md`, and fill in every section before handing to Claude.
> The more detail here, the better the first build. Leave nothing blank — use "TBD" or "no preference" if genuinely unsure.

---

## 1. Identity

Field	Your answer
Full name	
Late to the Party  

Short ID / abbreviation	
lttp — used in code as prefix for all variables and functions  

Tagline	
Everyone's at the party except you. Figure out the address before the Uber arrives!  

Emoji / icon	
🏃‍♂️  

Brand colour	
Red (specifically a vibrant, urgent red to contrast existing palette)  

Thematic universe	
A frantic Friday night group chat. Planning the big night out.

---

## 2. Players

Field	Your answer
Player count range	
4–6 (Default 4).  

Teams or individuals?	
One (The Stray) vs. Many (The Inner Circle)  

Roles	
The Stray: Doesn't know the location. The Inner Circle: Knows the location. The Joker (Sylly Mode): Know the address but lead the Stray to fake targets.  

Phone handling	
Pass-the-phone. Players look at their info secretly then pass to the player they choose to interrogate.  

Turn structure	
Sequential (one player at a time asking questions in a circle).

---

## 3. Core Mechanic

In one sentence, what does a player DO on their turn?

Ask a question to another player to verify they know the address, while the Stray listens to deduce the location from a 4x4 grid.  

What is the central tension or challenge?

The Inner Circle must be specific enough to prove they aren't "Late," but vague enough that the Stray doesn't spot the location on the map.  

What type of interaction is at the heart of it?

Bluff / Deduce / Interrogate.  

Is there a hidden element?

Yes. The exact location is hidden from the Stray and slowly revealed to the Inner Circle via closing down on "The Pick" location  

Is there a word or prompt drawn each round?

Yes. One location is drawn from words.json (Places category).

---

## 4. Round Structure

Step 1 — The Handover:
  Who acts: Active Player.
  What happens: Takes the phone and reviews their status and the current 4x4 grid with highlights.
  What is shown on screen: Role reveal ("Are you Late?") and the current Map/The Pick status.

Step 2 — The Interrogation:
  Who acts: Active Player.
  What happens: Chooses an available player to ask a question verbally.
  What is shown on screen: List of players (greyed out if they have already answered/asked this round).

Step 3 — The Transition:
  Who acts: Active Player.
  What happens: Taps "Next Turn" and passes the phone to that player.
  What is shown on screen: Privacy screen for the next player.

Step 4 — The Pick:
  Who acts: System.
  What happens: After a full lap of questions, the engine narrows the highlights (6 squares → 3 → 1).
  What is shown on screen: Updated map for the next round.

Step 5 — The Pin & Vote:
  Who acts: All Players.
  What happens: Final interrogation round followed by everyone voting for the Stray and the Stray attempting to pin the address.

Does the phone need to be passed during a round?

Yes, at every transition between Step 2 and Step 3.  

Is there a timer in any phase?

No.

---

## 5. Win / End Condition

Field	Your answer
How does a game end?	
After Round 4 once everyone has locked in their guess and the Stray has pinned a location.  

How is the winner determined?	
Stray wins if they pin correctly OR if the "Confusion Bonus" triggers (more incorrect votes than correct ones).  

Are ties possible?	
No.  

Is there a "sudden death" or tiebreak?	
No.  

Post-game screen	
Shows "The Address," identity of the Stray, and a round-by-round log of the The Pick highlights.

---

## 6. Scoring

Outcome	Points	Notes
Stray pins Address	+10 (Stray)	
They made it to the party!  

Stray misses Address	+5 (Circle)	
The group kept the secret.  

Correct Vote for Stray	+2 (Circle)	
Identifying the lost friend (deducts 2 from Stray).  

Incorrect Vote for Stray	+2 (Stray)	
Stray successfully blended in (deducts 2 from Circle).  

Joker Perfect Prank	+20 (Joker)	
Stray pins a Joker's Fake Target.

Is scoring cumulative across rounds?

Scoring is at the end of the game, not per round.  

Are there any multipliers, bonuses, or combos?

Confusion Bonus: If more people guess the wrong Stray than the right one, the Stray should get enough points to win. But still might lose out to the Joker in sylly mode. 

Can a player go negative?

Its Circle vs Stray vs (Joker). Yes let's make it so Circle can go negative and thus Stray wins.

---

## 7. Settings

Setting name (thematic)	What it controls	Options	Default
"Party Destination"	Word Pool Complexity	Level 1 / Level 2	
Level 1

Is there a difficulty setting?

Yes. Level 1 ("The Local Hang") uses d2 common places. Level 2 ("The Secret Trip") uses d3 obscure places.

---

## 8. Sylly Mode

Field	Your answer
What does Sylly Mode change?	
Adds The Joker role to the Inner Circle.  

Is it a full phase add-on or a round modifier?	
Round modifier (extra role).  

Thematic name for Sylly Mode in this game	
"The Joker" - that one bad friend.

What does the player gain by enabling it?	
Chaos; the Joker must trick the Stray into picking one of two "Fake Targets."  

Does it change the win condition?	
Yes — creates a three-way fight for points.

---

## 9. Screens & Flow

List every screen the player will see, in the order they appear. Use the format: `SCREEN NAME — one-line description`.

LTTP_MENU     — game title card + Get the Address button
LTTP_SETUP    — player entry / difficulty / Sylly mode toggle
LTTP_REVEAL   — "Are you Late?" pass-the-phone role check
LTTP_CHAT     — main grid / Interrogation hub / History / Notes
LTTP_GUESS    — voting screen and the 4x4 grid for the Stray to pin
LTTP_GAMEOVER — results screen with Street Cred tally
List any overlays needed:

Map Modal: The 4x4 grid view.  

Suspicion Modal: List to toggle player status (Safe/Sus/Joker).  

Quit Confirm: "Cancel the plans?"

---

## 10. Terminology / Voice

Fill in the game's internal vocabulary. These become the labels on screen and in code.

Concept	This game calls it
A single game session	
a session  

One round	
a Plan  

The word/prompt drawn each round	
The Destination / The Address  

A player's score	
Friendship Points  

The score screen	
The Tally  

The end-of-game screen	
Game Over  

History
Group Chatlog

Play Again	
New Plans

Settings overlay title: Frequency Configuration
Settings overlay subtitle: Set the vibe before the Uber arrives.
Menu CTA button label: Get the Address!
Quit overlay copy:  Emoji: 🚨  Heading: "Cancel the plans?"  Subtext: "Everyone will just stay home."  Confirm button: "Yeah, staying in."  Cancel button: "Not yet!"  

---

## 11. Content / Words

Field	Your answer
Does this game use words.json?	
Yes  

Which categories?	
places

  

Which difficulty tiers?	
Level 1 (d2) / Level 2 (d3)  

Does it need custom data not in words.json?	
No  

Secret Mode word substitution	
category === 'places'

  

Any content rules specific to this game?	
not that I can think of yet

---

## 12. Sample Round

> Write out one complete round as if you were playing with real players. Include player names, what they say/do, and what the screen shows at each step. This is the single most useful thing for Claude to reference.

Setup: Destination is "THE ZOO".

[Player A (Inner Circle)] sees: "📍 Inner Circle - Party Options." Modal shows up and player sees 4v4 location grid. Highlights show Zoo, Farm, Park, Beach, Stadium, Cinema. Done to exit out of modal. Play screen (map icon at top to bring it back up)
[Player A] does: Asks Player B (Stray) "Will we need to buy tickets?"

[Player B (Stray)] sees: "🚨 YOU ARE LATE." Grid shows 16 plain names.
[Player B] does: Answers "Yeah, definitely at the gate." Then asks Player C (Inner Circle) "Is it smelly there?"

[Player C (Inner Circle)] sees: "📍 Inner Circle - Party Options." Modal shows up and player sees 4v4 location grid. Highlights show Zoo, Farm, Park, Beach, Stadium, Cinema. Done to exit out of modal. Play screen (map icon at top to bring it back up)[cite: 1]
[Player C] does: Answers "Only near the enclosures."[cite: 1]

Screen shows: "The Pick is narrowing..." Highlights drop to Zoo, Farm, Park, Beach.[cite: 1]

Result: Player B rules out "Beach" based on the "enclosures" comment.[cite: 1]

---

## 13. Sample Phrasing / UI Copy

Provide example phrases in the game's voice for each of these moments. These seed the tone for all on-screen text.

Moment,Example phrase
Round start prompt,"""🚨 YOU ARE LATE. Listen to the chat and find the party location.""[cite: 1]"
Correct / success,"""You know your friends so well ""[cite: 1]"
Wrong / fail,"""Didn't expect that from them ""[cite: 1]"
Waiting for others,"""The chat is blowing up... wait for your turn.""[cite: 1]"
Game over — winner,"""Group Leader: [Name]""[cite: 1]"
Game over — joker win,"""Who invited [Name]? Never again.""[cite: 1]"

---

## 14. Mood & References

Field,Your answer
Real-world games it resembles,Spyfall meets Codenames[cite: 1]
Tone,Tense / Chaotic[cite: 1]
Pace,Fast and punchy[cite: 1]
Who is the target player?,Friend groups[cite: 1]
Anything it should NOT feel like?,Not trivia-based.[cite: 1]

---

## 15. Out of Scope (v1)

List anything you're explicitly NOT building in the first version. This stops scope creep and keeps the first build shippable.

No custom location entry.[cite: 1]

No animated map transitions beyond simple highlight updates.[cite: 1]

No visual animation (v1).[cite: 1]

---

## 16. Open Questions

Anything you're not sure about yet. Claude will ask about these before coding.

Sample active player screen setup

1. The Turn Header

The Look: A bold red banner at the top.

The Text: "IT'S [PLAYER NAME]'S TURN"

Subtext: "Ask a friend, feel the vibe."

2. The Toolkit (Top Left Icons)

These are fixed "Quick-Access" buttons that don't change during the round.

🗺️ View Map (The Grid):

Opens a modal showing the 4x4 Destination Grid.

Inner Circle: Sees the addresses with some highlighted (depending on the round).

The Stray: Sees all plain text (no highlights). Can click on each location to cycle status: None → Green (possible address) → Red (Ruled out) → None

The Leak: The grid updates automatically here as rounds progress.

🕵️ Suspicion List (The Tracker):

Opens a modal listing all players.

Clicking a name cycles their status: [ ] None -> ✅ Safe -> ❓ Suspicious -> 🤡 Joker.

Why this matters: Essential for the Round 4 vote when you have 6+ players to track.

3. The Interrogation Hub (Main Screen)

Prompt: "Who are you grilling?"

The List: A vertical list of player buttons.

Greyed out: Players who have already answered this round.

Active: Players eligible to be asked.

Action: Tapping a name logs the "Handover" and moves to the next turn.

4. The Record (Lower Section)

📜 History (The Feed):

A compact, scrollable list of the latest interactions.

Format: Sam ➡️ Alex, Alex ➡️ Jess.

Purpose: Helps the Stray spot "linguistic loops" or people who keep avoiding each other.

📝 Notes (The Scratchpad):

A simple <textarea> with a "Auto-save" feature.

Placeholder text: "Jot down those half-truths here..."

---
*Template version: Phase 12 — update alongside `ui-style.md` and `logic-engine.md` when standards change.*


