# Cookie Jar

**Game 18** · `activeGameId: cjar` · plugin `js/games/cjar.js`
**Emoji:** 🍪 · **Brand:** honey-gold `#D4A017`, dark ink · **Players:** 3–8 · **Modes:** MDLM only
**Status:** gold master · verified against SW v209 on 22 August 2026

---

## T3 — How to Play

**Setup.** Everyone is raiding the same jar at the same time. Each player has a **Cookie Stash** —
their banked score, which runs across the whole Match and can never go down. A Match is a series
of **Raids**; each Raid deals a fresh jar.

**The loop.** A card comes out of the jar and everyone sees it at once. It is one of three things:

- **Cookies** — a number. It splits evenly between everyone still in the Raid. Whatever will not
  divide falls into the **Cookie Crumbs**, a shared pool sitting on the bench.
- **A family member** — Mum, Dad, Big Brother, Grandma or the Dog. The first time one turns up
  this Raid it is only a scare. The second sighting of the *same* person ends the Raid.
- **A Treat** — a bonus card that lands on the counter and waits to be claimed.

The card resolves first, and *then* everyone chooses, secretly and simultaneously. The choice is
never about the card you have just seen — it is about the next, unseen one:

- **Reach In Again** — stay in for the next card.
- **Sneak Out** — leave now, banking your share of this Raid plus a split of the Crumbs.

**Sneaking out alone is the prize.** If you are the only one leaving on a given flip, you scoop
*every* crumb on the bench and any unclaimed Treat on the counter. Leave alongside someone else and
you split the crumbs between you.

**Getting busted.** When a family member is sighted a second time, the Raid ends immediately:
everyone still in the kitchen loses everything they were carrying **this Raid**. Banked Cookie
Stashes are untouched. A bust costs you only what you had not yet secured.

**The Raid also ends** if the jar runs out of cards, or if every player has sneaked out.

**How it ends.** After the last Raid — three or five, depending on Match Length — the biggest
Cookie Stash wins and is named **Top Cookie Thief**. A tie is broken by who claimed more Treats;
still tied, the spot is shared. Last place is called out as **Red-Handed** — though never on a
match where everyone finished level.

---

## T4 — Theme & Flavour

*(Written in Task 5 — owner checkpoint.)*

---

## T5 — Terminology

| Term | Meaning |
|------|---------|
| **Raid** | One hand. Flips continue until a bust, the jar runs out, or every player has sneaked out. |
| **Cookie Stash** | A player's private banked score, running across the whole Match. Safe from busts. |
| **Cookie Crumbs** | The shared, unbanked pool every indivisible remainder falls into. The on-screen counter is labelled just **Crumbs**. |
| **Crumb Trail** | This Raid's flip-by-flip log overlay. |
| **House Rules** | The setting governing what a bust does to that family member's remaining copies. |
| **Reach In Again** | Stay in the Raid for the next card. The base game's "keep going" choice. |
| **Sneak Out** | Leave the Raid now, banking your share of this Raid plus a split of the Crumbs. Alone, you also claim any unclaimed Treat. |
| **BUSTED!** | The bust moment — a family member sighted a second time this Raid. Raid totals wipe for everyone still in; Cookie Stashes are untouched. |
| **Family card** | A card bearing one of the five family archetypes. The second sighting of the same one busts the Raid. |
| **Cookie card** | A card bearing a cookie count. Splits among everyone still in; the remainder goes to Crumbs. |
| **Treat** | A bonus card worth 5 or 10, claimable by a lone Sneak-Out in the base game. |
| **Red-Handed** | The last-place label on the gameover screen. Never awarded when every rank ties. |
| **Top Cookie Thief** | The winner's label on the gameover screen. |
| **Snack Friendly** | The setting that guarantees a cookie card floats near the top of the deal, so nobody is busted before they have grabbed anything. |

### Naming rules — these are constraints, not preferences

These exist because another game in the suite already owns the word. Breaking one creates a
collision a player will feel as two games using one term for two different things.

- **Never write the bare word "Stash" in user-facing copy — always "Cookie Stash".** Both Fruit
  Salad and Flawless use "The Stash" to mean a hand of cards.
- **"Crumb Trail", never "Cookie Trail".** Pecking Order owns *The Trail*.
- **"House Rules", never "Kitchen Rules".** Just Enough Cooks owns the kitchen metaphor suite-wide.
- **In Dibber Dobber the word "Sneak" never appears.** Nobody leaves in Sylly Mode, so reusing the
  base game's verb would teach the wrong rule.

### Dibber Dobber vocabulary (Sylly Mode)

| Term | Meaning |
|------|---------|
| **Dibber Dobber** | The Sylly Mode itself — no bust, nobody leaves, three actions instead of two. |
| **Reach In** | Claim a share of the flipped cookie card or Treat. A straightforward claim, not a stay-or-leave choice. |
| **Play Innocent** | Pretend not to be involved. Free on a cookie card; on a Caught! card the cost depends on your secret affinity. If nobody Dobs, the Innocents sweep the entire Crumb pool. |
| **Dob** | Accuse. Steals a fixed amount from the Takers on a cookie card, but always backfires on a Caught! card, whether or not anyone else Dobs. |
| **Favourite** | Your secret family member who never costs you anything on a Caught! card. |
| **Watcher** | Your secret family member who always costs you double. Never the same person as your Favourite. |
| **Crumb Debt** | A capped IOU recorded when you cannot fully pay a loss, repaid out of future gains before anything reaches your Cookie Stash. Forgiven at every Raid boundary. It is a side-ledger, never a negative balance. |
| **The scare-off** | The informal name for Play Innocent's Crumb sweep when no Dobber is present. |

---

## T6 — Settings

The settings overlay is titled **Cookie Playbook 🍪** — *"How the raid runs — and how much trouble
you're in."*

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **Snack Friendly** | Off · Safe First Grab · Warm-Up | Safe First Grab | Guarantees cookies come out early, so nobody is busted before they have grabbed anything. |
| **House Rules** | Standard Burn · On Guard · High Alert | Standard Burn | What happens to a family member after they catch you. Standard Burn makes them slightly less likely next time; High Alert makes *someone else* more likely. |
| **Match Length** | Quick Snack · Full Feast | Full Feast | Three Raids or five before the biggest Cookie Stash wins. |
| **Decision Time** | Blitz · Standard · No Rush | Standard | How long everyone gets to choose each flip. |
| **Open Book** | ON / OFF | ON | Shows everyone's cookies to everyone. Off, you see only your own numbers — you still hear what happened to the others, just not how much. |
| **✨ Sylly Mode** | ON / OFF | OFF | Dibber Dobber. See T8. |

**Pill labels carry the thematic name only; the concrete value appears on a live line below the
row.** Cookie Jar is the suite's reference implementation of that rule — Match Length dropped its
baked-in "(3)" / "(5)", and Decision Time gained the seconds it had never shown anywhere.

**No Rush is a genuine no-clock, not a very long timer.** The timer bar is hidden outright rather
than shown full, and the jar simply waits for the slowest hand.

**Snack Friendly is superseded by Sylly Mode.** Its card is hidden while Dibber Dobber is on — but
its *spirit* still applies there: a cookie card is always floated to the first flip of a Sylly deck,
so a blind commit is never punished before anyone has seen a single card.

---

## T7 — The Player's Journey

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-cjar-menu` | Pick your poison | Menu | — | 🔊 |
| 2 | `screen-cjar-raid-intro` | "Raid 2 of 5" — a fresh jar | Interstitial | 5 s | none |
| 3 | `screen-cjar-table` | The jar: a card turns, everyone commits | Interactive | — | `[?]` 🔊 ✕ |
| 4 | `screen-cjar-busted` | You got caught | Interstitial | 5 s | none |
| 5 | `screen-cjar-raid-summary` | Count the takings | Summary | — | `[?]` 🔊 ✕ |
| 6 | `screen-cjar-gameover` | The Haul | Result | — | 🔊 ✕ |

There is **no setup screen and no pass-gate** — names come from the lobby roster, and every player
is on their own phone, so there is nobody to hand it to.

Both interstitials carry no chrome at all. That is deliberate: they auto-advance *and* have nothing
to tap, which are the two conditions of the interstitial exemption. Five seconds is the practical
ceiling, not a target.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `cjar-settings-overlay` | Menu | Cookie Playbook — the six settings |
| `cjar-how-to-overlay` | Menu, table `[?]`, summary `[?]` | How to Play — two tabs, **The Rules** and **The Cards** |
| `cjar-trail-overlay` | Table | Crumb Trail — this Raid's flip-by-flip log |
| `cjar-tip-overlay` | Table's inline `[?]` buttons | Contextual tip — Crumbs, the family strip |
| `cjar-card-view-overlay` | Tapping a card in the history strip | The card, enlarged, with its name |
| `cjar-quit-overlay` | Table, summary ✕ | Mid-game quit confirm |
| `cjar-new-raid-overlay` | Gameover | Play-again confirm |

### T7b — The words on screen

#### The menu

```copy
# screen-cjar-menu
Cookie Jar
Who took the cookies from the cookie jar?
Raid the Jar!
How to Play
Settings
← Back to the Box
```

#### Raid intro

Heading is built at runtime as *"Raid N of M"*. The affinity box appears in Dibber Dobber only, and
only to the player it belongs to.

```copy
# screen-cjar-raid-intro
Fresh jar, fresh family. Grab what you can.
Fresh jar. Nobody leaves, nobody busts.
they look the other way.
Only you can see this.
```

#### The table

```copy
# screen-cjar-table — stage labels
up for grabs
Next from Jar
Left in Jar
just revealed
what's come out &rsaquo;
Nothing yet — the jar is still shut.
```

```copy
# screen-cjar-table — the standings grid
Player
Stashed
Status
At Risk
Still In
Snuck Out
```

```copy
# screen-cjar-table — the action buttons
Reach In Again
Sneak Out
Reach In
Play Innocent
Dob
```

```copy
# screen-cjar-table — outcome lines written into a player's row
Took a cookie.
Sneaked out.
Played innocent.
Dobbed.
```

```copy
# screen-cjar-table — waiting and spectating states
Waiting on…
Waiting for the host to open the jar…
```

#### Contextual tips, opened from the table's inline [?] buttons

```copy
# cjar-tip-overlay — Cookie Crumbs
Cookie Crumbs
Leftovers that wouldn’t split evenly.
Sneak Out alone and you take the lot.
Play innocent alone and the pile is yours.
Got it
```

```copy
# cjar-tip-overlay — the family strip
The Family
Dim = haven’t seen them this Raid.
Red = they’ve caught you once. One more and it’s BUSTED!
```

```copy
# cjar-tip-overlay — the jar
The Jar
Still in the deck
What is still to come. This is the one you are betting on.
```

#### Busted

Family name, emoji and the flavour line are per-card, drawn from `data/cjar-data.json` — see T4.

```copy
# screen-cjar-busted
BUSTED!
```

#### Raid summary

```copy
# screen-cjar-raid-summary
Next Raid
Waiting for the host…
```

#### Gameover

```copy
# screen-cjar-gameover
The Haul 🍪
Who took the cookies from the cookie jar?
Another Raid?
Leave the Jar
```

#### Settings — Cookie Playbook

```copy
# cjar-settings-overlay — title
Cookie Playbook 🍪
How the raid runs — and how much trouble you're in.
```

```copy
# cjar-settings-overlay — Snack Friendly
Snack Friendly
Guarantees the first card or two of every Raid is cookies, so nobody gets busted before they've grabbed anything.
Off
Safe First Grab
Warm-Up
No guarantee — the first card could be anyone.
The first card of every Raid is cookies.
The first two cards of every Raid are cookies.
```

```copy
# cjar-settings-overlay — House Rules
House Rules
Standard Burn
On Guard
High Alert
Copies never change — every Raid runs the same odds.
The catcher drops to 2 copies, and someone else climbs to 4.
```

```copy
# cjar-settings-overlay — Match Length and Decision Time
Match Length
How many Cookie Raids before the biggest Cookie Stash wins.
Quick Snack
Full Feast
Decision Time
Blitz
Standard
No Rush
No clock at all — the jar waits.
```

```copy
# cjar-settings-overlay — Open Book and Sylly Mode
Open Book
✨ Sylly Mode
Dibber Dobber
Got it
```

#### How to Play — The Rules

```copy
# cjar-how-to-overlay — title and tabs
How to Play 🍪
Grab cookies, don't get caught twice.
The Rules
The Cards
```

```copy
# cjar-how-to-overlay — step headings
A card comes out of the jar
Cookies get shared out straight away
Then everyone decides, at the same time
Sneak out alone and you take the crumbs
The family is watching
Banked cookies are safe forever
Five Raids, one jar
Winning and Scoring
Biggest Cookie Stash takes it
```

#### Quit and play-again

```copy
# cjar-quit-overlay
Giving up on the jar?
Your Cookie Stash will be lost.
Yeah, sneak off.
Keep raiding!
```

```copy
# cjar-new-raid-overlay
Another Raid?
Everyone's Cookie Stash goes back to zero.
Stay here
Restart in Lobby
Leave Session
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**Two beats do the work of six screens, and the Raid summary is the quiet one.** The table carries
the flip, the choreography, the payout and the decision; the summary that follows it only restates
numbers the standings grid already showed live under Open Book. It is the screen most likely to
read as a speed bump rather than a beat, and the one place a per-Raid flavour line — the way the
Raid intro has one — would cost nothing and add a breath.

**The Raid intro's flavour line does not rotate.** There are exactly two, chosen by mode, not by
Raid — so across a five-Raid Full Feast a player reads the same sentence five times. The suite's own
Round Intro standard calls for a small rotating pool, which Counting Sheep has and Cookie Jar does
not.

**Busted is the strongest beat in the game and the shortest-lived.** It gets a per-family flavour
line drawn from a real pool, the bust card runs the full flip choreography first, and then it is
gone in five seconds with nothing to acknowledge it. Of all the interstitials in the suite this is
the one where a player most wants a moment.

---

## T8 — Sylly Mode

**Dibber Dobber.** The name is Australian playground slang for a tattle-tale, and it is the whole
mode in one word.

**What changes.** Nobody leaves, nobody busts, and nobody ever loses everything. The two-way choice
becomes a three-way one, and all three are played face-down at once:

- **Reach In** — claim a share of the flipped card.
- **Play Innocent** — pretend you had nothing to do with it. Free on a cookie card. On a Caught!
  card the cost depends on your secret affinity. And if *nobody* Dobs, the Innocents sweep the
  entire Crumb pool between them — the move known informally as **the scare-off**.
- **Dob** — point the finger. It steals from whoever reached in, but it always backfires on a
  Caught! card, whether or not anyone else Dobbed.

**The secret each player carries.** At the start of every Raid you are privately told two family
members: your **Favourite**, who looks the other way and never costs you anything, and your
**Watcher**, who is onto you and costs you double. They are never the same person, they are
re-drawn each Raid, and only you can see them. That is what makes Play Innocent a read rather than
a coin-flip — the same Caught! card is cheap for one player at the table and expensive for another,
and nobody else knows which.

**Crumb Debt.** Because nobody can be wiped out, a player who cannot fully pay a loss records a
capped IOU instead. It is repaid out of future gains before anything reaches their Cookie Stash,
and it is forgiven at every Raid boundary along with the leftover Crumbs. It is a side-ledger, not
a negative score — a player in debt still reads as having what they have banked.

**The order of play inverts, deliberately.** The base game resolves a card and *then* asks you to
choose about the next, unseen one. Dibber Dobber cannot do that, because every outcome here is
driven by the choices themselves — so you commit **blind**, then the card is revealed and resolved
against what everyone picked. Both modes are still a gamble on a card you have not seen; they just
put the unseen card on opposite sides of the decision.

**What it supersedes.** Snack Friendly's card is hidden while Dibber Dobber is on, since there is no
bust to be protected from. Its spirit survives anyway: a cookie card is still floated to the first
flip, so the very first blind commitment of a Raid is never punished.

**One vocabulary rule.** The word **Sneak** never appears anywhere in this mode. Nobody leaves, so
borrowing the base game's verb would teach a rule that does not exist here.

---

## T9 — Art & Assets

**Cookie Jar ships with real artwork by default** — it is the first game in the suite to launch with
its own art rather than adding it after the fact, so no player has ever seen it in emoji fallback.

| What | Count | Where it renders |
|---|---|---|
| Cookie faces | 3 — Handful, Batch, Mountain | Table hero, history strip, card popup, gallery |
| Family faces | 5 — Mum, Dad, Big Brother, Grandma, the Dog | As above, plus the warning strip |
| Treat faces | 5 — shortbread, red velvet, macadamia, macarons, brownies | As above, plus the Up for Grabs slot |
| Card back | 1 | The face-down next card, and the deck stack |

Cookie art is banded rather than per-value: all fifteen cookie values share three illustrations
across the three tiers, so a Handful and a Mountain read differently at a glance without needing
fifteen pictures.

**Everything is precached.** The art is part of the app version, not an optional download — it is
present on a cold offline install, and changing it requires a service-worker version bump.

**Where to see it without playing.** How to Play → **The Cards** shows the full deck. That gallery
is built from the live card data through the same renderer the table uses, so it can never drift
from what is actually dealt, and it is skinnable along with everything else.

**It doubles as the offline install check.** Open that tab with no connection: illustrated cards
mean the art precached correctly, emoji mean it did not. Cookie Jar is multi-device only, so
without the gallery that check would need four phones and a live room to answer a service-worker
question.

Dimensions, file-size ceilings and the conversion process are **not** recorded here — they live in
`docs/art-authoring-guide.md`, which is the document to brief an artist from alongside T4.

---

## T10 — At the Table

**Modes.** Multi-device only. Every player uses their own phone; one person hosts and the rest join
with a room code. There is no pass-the-phone or shared-device option.

**Players.** 3 to 8.

**Devices.** One per player, no exceptions — the whole game is built on everyone choosing secretly
and simultaneously, which a shared screen cannot do.

**Shape-changing settings.** None. No setting alters the player count or the session structure.
(Match Length changes how *long* a match runs, not its shape.)

**How it plays at each size**

| Players | What it feels like |
|---|---|
| **3** | Thin. The bust maths barely bites and the Crumb pool rarely grows enough to make a lone Sneak-Out exciting. This is also the least-tested size — the balance work was done at 5 and 8, and 3 was an owner call rather than a simulated result. Worth watching. |
| **5–6** | The intended game. Enough players that cookie cards split awkwardly and leave real Crumbs behind, and enough that someone always leaves too early or too late. |
| **8** | Longer Raids and a bigger Crumb pool, but more waiting per flip — eight people must all commit before anything moves, and the slowest hand sets the pace on No Rush. |

**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*

**No, and not as a gap — as a consequence of the design.** The mechanic *is* simultaneous secret
commitment: everyone choosing at once, nobody knowing who else is about to leave. Passing one phone
around would serialise that into a turn order, and a player choosing fourth would know what three
others had already done. That is a different game, and a worse one. Cookie Jar's multi-device
requirement is load-bearing rather than incidental — unlike a turn-by-turn game where it is a
delivery choice.

---
