# Late to the Party

**Game 6** · `activeGameId: lttp` · plugin `js/games/lttp.js`
**Emoji:** 🏃‍♂️ · **Brand:** `red-500` · **Players:** 4–6 in both modes · **Modes:** PTP · MDLM (recommended)
**Status:** gold master · verified against SW v205 on 23 August 2026

> **Change contract.** Each section is tagged **free** (reword freely — but it must stay true),
> **paired** (change the doc and the code together, or you open a gap between them), or **derived**
> (change the code first; editing the doc only changes whether it is correct). Full rule:
> `docs/superpowers/specs/2026-08-22-game-identity-docs-design.md` § 5.
>
> **Where the technical detail lives.** Screen and overlay IDs, state variables, key functions and
> MP packet tables are in `docs/code-map.md` — Grep the game's name or an element ID, never
> full-read it. This document deliberately does not duplicate them.

---

## T1 — The Pitch · *free*

Everyone else already knows where the party is. You're the one texting around trying to sound like
you know too — and the messages you send to figure it out are the exact same messages the group is
reading for tells. It's a four-plan group chat where the address itself narrows into view for
everyone who's really in the loop, and the one person faking it has to land a pin on a map they've
never actually seen confirmed.

---

## T2 — The Premise · *free*

There's a party tonight, and everyone in the group chat knows where — except you, or maybe except
someone else. One player is the **Friend of a Friend**, invited along by someone who isn't actually
there to vouch for them, and they don't know the address. Everyone else is **The Gang**, and they
start the night with a shortlist of possible locations that gets narrower every time messages go
around.

Over four Plans, everyone messages one other person, once per Plan. What you say is really a cover
story — small talk that either quietly confirms you know the place, or quietly tries to sound like
you do. The Gang's shortlist of locations shrinks from six to three to one as the Plans go by, so by
the end the real address is obvious to anyone who's genuinely in the loop — the question is whether
the Friend of a Friend can read the room well enough to land on it too, from messages alone.

Last Drinks — the final Plan — is when it comes to a head: the group votes on who they think doesn't
actually know, and the Friend of a Friend has to pin the address on the map. Nobody's really been
lying, exactly — everyone's just been performing certainty they may or may not have. The game
produces the specific, funny paranoia of re-reading your last three texts to someone, wondering if
you sounded too vague to be real.

---

## T3 — How to Play · *free*

**Setup.** Choose your player count and enter names. One player is secretly assigned the **Friend
of a Friend** role; everyone else is **The Gang**, who together know the real party address from the
start.

**The loop.** The game runs across four **Plans**. In each Plan, every player messages one other
player — a free-typed message, or a suggested conversation-starter if Small Talk Helper is on.
Sending a message triggers an interrupt on every device, so the whole group sees who messaged whom
(never what was said, unless the recipient chooses to share it). After a full lap of messages, the
lap is complete and The Gang's shortlist of possible locations narrows — six locations after Plan 1,
three after Plan 2, down to the single real address by Plan 3.

The Gang can check the **Map** at any time to see their narrowing highlights, and can open
**Contacts** to review who they've talked to, tag a suspicion status on each other player, and jot
private notes. The Friend of a Friend sees every location on the map from the start (never narrowed)
and can annotate any cell as Maybe or Nope based on what they've picked up from messages.

**How it ends — Last Drinks.** After Plan 4, the group votes on who they believe is the Friend of a
Friend (either together on one shared screen, or privately one at a time, depending on Group Vote).
Simultaneously, the Friend of a Friend pins their best guess for the real address on the map. Both
resolve together at the reveal.

**Scoring.** The Friend of a Friend scores for pinning the real address correctly. The Gang each
score for keeping the secret — i.e. the group failing to catch the Friend of a Friend's location
guess. (Sylly Mode adds a third scoring path — see T8.)

---

## T4 — Theme & Flavour · *free*

**The world.** A group chat the night of a party — casual small talk standing in for detective work,
location pins and shortlists standing in for evidence. The framing is social and a little gossipy
rather than tense; it's playing "figuring out where everyone's going tonight," not "interrogation."

**The voice** stays breezy and social throughout: settings live under "Night Out Settings," the quit
prompt asks "Cancel the plans?", the play-again prompt asks to "Head Out Again?" The rotating folder
hints (in-app strategy nudges shown while annotating a contact) lean into the same register — "What
did they say? Does it match the map?" reads like genuine group-chat detective work, not a rules
hint.

**On theme:** casual group-chat banter, small talk that's secretly strategic, the specific comedy of
overanalysing a totally normal-sounding text message.

**Off theme:** anything that reads as real accusation or interrogation, heavy or paranoid framing,
technical/procedural language that breaks the "just a group of mates texting" illusion.

Australian English throughout.

---

## T5 — Terminology · *paired*

| Term | Meaning |
|------|---------|
| **Friend of a Friend** | The outsider — doesn't know the address, trying to blend in and figure it out. |
| **The Gang** | Everyone who knows the address (every player except the Friend of a Friend). |
| **The Troublemaker** | Sylly Mode only — a Gang member who plants a fake location to mislead. |
| **Plan** | One full lap of messaging (every player messages someone once); the game runs 4. |
| **Locations** | The grid of possible addresses shown on the map. |
| **Lap** | One full round of turns — all players message once. |
| **Contacts** | The suspicion-tracking overlay — a roster of other players, each with their own folder. |
| **Folder** | Per-player notes and status chip inside the Contacts overlay. |
| **Friendship Points** | The score currency. |
| **Last Drinks** | The name for Plan 4 — the final lap, ending in the vote and the pin. |

**Status chip cycle (keyed to the active player's own role):**

| Role | Cycle |
|---|---|
| The Gang | None → ✅ Maybe → ❓ Sus → 🃏 Troublemaker → None |
| The Troublemaker (Sylly Mode) | None → ✅ Maybe → ❓ Sus → None |
| Friend of a Friend, Sylly Mode ON | None → 🃏 Troublemaker → None |
| Friend of a Friend, Sylly Mode OFF | Status section hidden entirely |

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **Night Out Settings 🗺️** — *"What's the plan tonight?"*

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **Party Destination** | The Local Hang · The Secret Spot | The Local Hang | Controls how familiar (i.e. how easy) tonight's location pool is. |
| **Group Vote** | OFF / ON | ON | ON: everyone votes together on who's the Friend of a Friend, on one shared screen. OFF: the vote is taken privately, one player at a time. |
| **Small Talk Helper** | OFF / ON | OFF | Suggests conversation-starter prompts before you type a message, across several topic categories. |
| **✨ Sylly Mode** | OFF / ON | OFF | The Troublemaker. See T8. |

Player count (4–6, default 4) is set on the setup screen, not in this overlay.

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-lttp-menu` | Pick your poison | Menu | — | 🔊 |
| 2 | `screen-lttp-setup` | Who's Coming? — count + names | Setup | — | 🔊 |
| 3 | `screen-lttp-briefing` | "Tonight's Plans" — session recap | Interactive | — | 🔊 ✕ |
| 4 | `screen-lttp-handover` | "Pass to …" | Gate | — | 🔊 ✕ |
| 5 | `screen-lttp-chat` | Map / Contacts hub — check locations, message a player | Interactive | — | `[?]` 🔊 ✕ |
| 6 | `screen-lttp-guess` | Plan 4 pass-the-phone: vote or pin | Interactive | — | 🔊 ✕ |
| 7 | `screen-lttp-group-guess` | Plan 4 shared vote (Group Vote ON) | Interactive | — | 🔊 ✕ |
| 8 | `screen-lttp-gameover` | How It All Played Out | Result | — | 🔊 ✕ |

Rows 4–5 loop once per player per Plan for Plans 1–3; row 6 (or 7, depending on Group Vote) is the
Plan 4 resolution. `screen-lttp-briefing` also reappears between Plans as a "Plans Updated" recap,
not only at the start.

`screen-lttp-role-reveal` is registered in `allScreens[]` and still fully built (its section header
comment lists it as part of the flow) but nothing in `lttp.js` ever shows it — role information is
folded directly into the Chat screen's header instead (`lttp-chat-role-label` /
`lttp-chat-role-objective`). See T7c.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `lttp-suspicion-overlay` | Chat's Contacts tab | Contacts — roster and per-player folders |
| `lttp-history-overlay` | Contacts' chatlog preview | Group Chatlog — the full message history |
| `lttp-guess-map-overlay` | Guess screen's 🗺️ | Read-only map with your own annotations, during Plan 4 |
| `lttp-settings-overlay` | Menu | Night Out Settings — the three settings |
| `lttp-how-to-overlay` | Menu, chat `[?]` | How to Play — no tab bar |
| `lttp-confirm-overlay` | Contacts (tap a name) or the Small Talk overlay | Free-text message — always the final step before sending |
| `lttp-smalltalk-overlay` | Contacts (tap a name), only when Small Talk Helper is ON | Topic tabs + prompt pills, feeding into the confirm overlay |
| `lttp-quit-overlay` | Every in-game screen's ✕ | "Cancel the plans?" mid-game quit confirm |
| `lttp-new-plans-overlay` | Gameover | "Head Out Again?" play-again confirm |
| `lttp-tip-overlay` | Chat's inline `?` (map instructions) | Contextual tip, shared shape with the how-to `[?]` |
| `lttp-help-tip-overlay` | Confirm overlay's inline `[?]` | Legacy single-string contextual tip |

### T7b — The words on screen

#### The menu

```copy
# screen-lttp-menu
Late To
The Party
Everyone's at the party except you.
Find The Location!
How to Play
Settings
← Back to the Box
```

#### Setup

```copy
# screen-lttp-setup
Who's Coming?
Players
How many friends are at the party?
Everyone's In! →
```

#### Briefing

```copy
# screen-lttp-briefing
Tonight's Plans
Let's Go
```

#### Handover

```copy
# screen-lttp-handover
Don't peek — hand it over.
I'm Ready
Read this message aloud, then hand over the phone.
```

#### Chat

```copy
# screen-lttp-chat — map pane
🗺️ Map
🕵️ Contacts
1. Check the map.  2. Tap Contacts to choose who to message.
```

```copy
# screen-lttp-chat — contacts pane
👥 Contacts
Tap a name to message · tap notes to annotate.
Contact
Notes
Status
📜 Group Chatlog ›
```

#### Guess (pass-the-phone)

```copy
# screen-lttp-guess
Don't peek — it's time to find the Friend of a Friend.
I'm Ready
Lock It In
```

#### Group guess (shared vote)

```copy
# screen-lttp-group-guess
Plan 4 — Last Drinks
Who's the Friend of a Friend?
Discuss as a group, then tap to select.
Lock It In
```

#### Gameover

```copy
# screen-lttp-gameover
How It All Played Out
Who They Voted
The Plans
New Plans
← Back to the Box
```

#### Contacts folder

```copy
# lttp-suspicion-overlay
← Done
Status
Observations
Done
```

#### Group Chatlog

```copy
# lttp-history-overlay
Group Chatlog 📜
Close
```

#### Guess map

```copy
# lttp-guess-map-overlay
🚨 Your Map — Annotations
Use your notes to pick the right location.
Done
```

#### Settings — Night Out Settings

```copy
# lttp-settings-overlay — title
Night Out Settings 🗺️
What's the plan tonight?
```

```copy
# lttp-settings-overlay — Party Destination
Party Destination
How familiar is tonight's location?
The Local Hang
The Secret Spot
```

```copy
# lttp-settings-overlay — Group Vote and Small Talk Helper
Group Vote
Everyone votes together on who's the Friend of a Friend. Turn off to pass the phone individually.
Small Talk Helper
Suggests conversation starters to help kick off small talk before you type your message.
```

```copy
# lttp-settings-overlay — Sylly Mode
✨ Sylly Mode
The Troublemaker
One Gang member knows the real location and holds 2 decoys to plant. If the Friend of a Friend pins one, The Troublemaker scores big instead.
Done
```

#### How to Play

```copy
# lttp-how-to-overlay — title
How to Play 🏃‍♂️
Figure out the secret address. Don't blow your cover.
```

```copy
# lttp-how-to-overlay — steps
Step 1
Roles are assigned in secret.
One player is the Friend of a Friend — they don't know the location and are trying to blend in. Everyone else is The Gang — they see a shortlist of possible locations that narrows each plan.
Step 2
Players message each other over 4 Plans.
Each lap, every player messages one other player. The Gang's shortlist narrows:
6 → 3 → 1 location
. By Plan 3, The Gang knows the exact spot — but the Friend of a Friend might too if they've been paying attention.
Step 3
Use the map to track locations.
Open 🗺️ any time. The Gang see their narrowing highlights. Friend of a Friend sees all locations and can annotate ✅ Safe or ❌ Dead End.
Step 4
Plan 4 — Last Drinks.
After the final plan, everyone votes on who they think is the
Friend of a Friend
, and the Friend of a Friend pins their guess on the map.
Winning and Scoring
Points for the right read.
📍 Friend of a Friend pins correctly → +10 pts.
🕵️ The Gang keeps the secret → +5 each.
🃏 Troublemaker plants a fake → +20 if the Friend of a Friend pins it.
✨ Sylly Mode
The Troublemaker
One member of The Gang secretly knows the real location and holds 2 decoy locations. They want the Friend of a Friend to pin a decoy instead. Three-way scoring: Friend of a Friend, The Gang, and The Troublemaker each have different win conditions.
Got it
```

#### Message composer

```copy
# lttp-confirm-overlay
Type your message...
0 / 80
Send
Cancel
```

#### Quit and play-again

```copy
# lttp-quit-overlay
Cancel the plans?
Everyone will just stay home.
Yeah, staying in.
Not yet!
```

```copy
# lttp-new-plans-overlay
Head Out Again?
All suspicions, messages, and location guesses will be forgotten.
Head Out Again
Stay here
```

#### Small Talk Helper

```copy
# lttp-smalltalk-overlay
Asking
Use this →
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**MDLM's player-count bounds were pinned to a value only the single-device setup screen ever
changes.** **RESOLVED 23 Aug 2026 (SW v210).** `getMinPlayers()` **and** `getMaxPlayers()` for `lttp` both resolved to
`lttpPlayerCount`, which only moves when the Pass-the-Phone setup screen's count pills are tapped.
Lobby Mode skips that screen entirely (the host goes straight from the lobby into
`lttpStartGame()`), so `lttpPlayerCount` never left its default of 4 — and with min *and* max both
pinned to it, **an MDLM room could only ever be exactly 4 players**, not the 4–6 Pass-the-Phone
supports, with nothing in Lobby Mode explaining why a 5th join was rejected. LTTP was the worst of
the five instances for exactly that reason: the others lost only their upper range. The bounds are
now constants, min 4 / max 6. Five games shared this exact root cause (SS, JEC, YGI, LTTP, DSD). The fix was not
"read the roster's live size" but something simpler: a lobby bound is consulted **only** while the
room fills, so it must never read game-local setup state at all — it now returns the game's true
range as a constant. `node tools/verify-mp-configs.js` § 3 makes the old shape unrepresentable,
and § 4 asserts each game's lobby bounds against its own Pass-the-Phone count pills.

**`screen-lttp-role-reveal` is dead code that still ships.** It's registered in `allScreens[]`, has
a complete Stack-migrated layout, and its section comment lists it as part of LTTP's screen
inventory — but nothing in `lttp.js` calls `showScreen('screen-lttp-role-reveal')` or any wrapping
function. Role information is instead folded into the Chat screen's own header on first entry. The
screen either needs a real trigger or removing, and until then it's a maintenance trap — a future
edit could "fix" it into firing without anyone noticing it was never meant to.

**Three contextual-help surfaces exist with unclear boundaries.** The header `[?]` opens the full
How to Play overlay; a second inline `?` next to the map instructions opens `lttp-tip-overlay`; and
the message composer has its own `[?]` opening `lttp-help-tip-overlay` (a legacy single-string
variant, distinct in shape from every other tip overlay in the suite). A player has no way to know
which of the two non-header `?` icons goes where before tapping one.

---

## T8 — Sylly Mode · *free*

**The Troublemaker.** The name is exactly what it says — this is the mode where someone in The Gang
stops being on the same side as everyone else.

**What changes.** One member of The Gang is secretly given a second identity: they know the real
address like the rest of The Gang, but they're also handed two decoy locations to plant. Their goal
inverts The Gang's — rather than protecting the secret, they're trying to get the Friend of a Friend
to pin one of their decoys instead of the real address. The Friend of a Friend's map now shows a
gold cell (the real address) and a purple cell (the Troublemaker's active decoy) to the Troublemaker
only — everyone else's map is unchanged.

**Scoring becomes three-way.** The Friend of a Friend still scores for pinning correctly, and The
Gang still scores for the secret staying safe — but now the Troublemaker has their own win
condition, scoring big specifically when the Friend of a Friend pins one of the planted decoys
instead of the real spot. All three outcomes are mutually exclusive on any given reveal.

**What it doesn't touch.** The four-Plan structure, the messaging loop, and the narrowing shortlist
are all unchanged — The Troublemaker adds a second, competing goal inside the existing loop rather
than changing its shape.

---

## T9 — Art & Assets · *derived*

**Late to the Party has no artwork of its own.** Every visual element is emoji (🏃‍♂️, 📱, 🗺️, 🕵️,
🚨, 📜) or coloured grid cells for the location map. There is no card, tile, or token art to
convert, and no How-to gallery tab — the map and the message log are the whole visual surface.

**Locations** are drawn from the shared `data/words.json` `places` category, filtered by Party
Destination's difficulty tier — The Local Hang draws the easier, more familiar tier; The Secret Spot
opens the harder, more obscure tier (plus the secret-mode pool).

**Small Talk Helper's prompt bank** lives inline in `js/games/lttp.js` as the `LTTP_SMALL_TALK`
constant — five categories (Getting There, Timing, The Crowd, The Vibe, Casual), four prompts each,
plus a free-form "Other" tab. It renders through the Small Talk overlay's tab bar rather than any
shipped art.

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** Pass-the-Phone and Multi-Device Lobby Mode (recommended) are both supported. There is no
Team Lobby Mode — Late to the Party has no teams, only individual roles.

**Players.** 4 to 6 in both modes — Pass-the-Phone and Lobby Mode alike (see T7c; Lobby Mode was
locked to exactly 4 until 23 Aug 2026).

**Devices.** Pass-the-Phone shares one device for the whole game, handed off at every handover gate.
MDLM gives one device per player.

**Shape-changing settings.** None of the three settings alter player count or session structure.

**How it plays at each size**

| Players | What it feels like |
|---|---|
| **4** | The only size Lobby Mode currently offers — tight message loops, fewer contacts to track, and a Friend of a Friend with fewer voices to blend into. |
| **5–6** | Pass-the-Phone only. More messages in circulation per Plan, a longer Contacts list to manage suspicions across, and more cover for the Friend of a Friend to hide their unfamiliarity in. |

**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*

**It already is, and this game may be the suite's strongest case for keeping both modes rather than
picking one.** Pass-the-Phone's shared device actually reinforces the social-deduction fun here —
everyone in the room hears the handover chatter and side comments a private-device MDLM game would
hide. But MDLM's private device also matters: it's what makes the confirm-overlay message text
actually private to the sender and recipient rather than something the whole room reads over a
shoulder. Neither mode is strictly better; they trade off different kinds of information control.

---
