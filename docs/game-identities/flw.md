# Flawless

**Game 16** · `activeGameId: flw` · plugin `js/games/flw.js`
**Emoji:** 💎 · **Brand:** two established pinks, used both ways round — `#F9A8D4` light fill /
`#A02050` dark ink · **Players:** 3–4 · **Modes:** MDLM only
**Status:** gold master · verified against SW v209 on 23 August 2026

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

Every turn you draw a second gem, and now you're holding two things at once: the one you're about
to show the table, and the one you're desperately trying not to. Play the wrong one and a rival gets
to peek at your Showpiece, swap it out from under you, or name it outright and expose you in front
of everyone. It's a faithful Love Letter under the hood — one of the tightest, most-copied deduction
games ever designed — dressed as a jewel heist where every card is a gem with a carat value and a
temperament. A round takes five minutes, the tension is entirely in what you choose *not* to play,
and it scales down to exactly the awkward three-to-four-player group size most party games ignore.

---

## T2 — The Premise · *free*

You're a Collector at a private exhibition, and everyone at the table is quietly trying to walk out
holding the most flawless stone in the room. You draw a second gem each turn, which means you always
have a choice between two — and the choice is the whole game. Play the low-value gem that peeks at
someone's Showpiece, or risk holding it and getting caught with the Pink Diamond in your pocket when
someone forces a discard? Every play tells the table something, whether you mean it to or not.

The tension compounds because nothing is secret for long. A Loupe reveals a hand. A Sapphire swaps
it. A Scratch Test just *asks*, out loud, "is that a Sapphire?" — and if they're right, you're
Exposed on the spot. The Vault empties fast, and when it runs dry, everyone still standing reveals at
once. The best Showpiece in the room wins the carat, whether you fought for it or just got lucky
enough not to be asked.

What it produces at the table is a lot of narrowed eyes over two cards, the specific dread of being
forced to discard something you were protecting, and the quiet satisfaction of a bluff nobody called.

---

## T3 — How to Play · *free*

**Setup.** Every **Collector** is dealt one secret **Showpiece** from a shared **Vault** — a fixed
21-gem deck. A handful of gems (set by **Smoke & Mirrors**) are burned face-down into **The Locked
Lot** before the deal and never seen by anyone. A session runs across several **Showings**; the
first Collector to a target number of **Cut Diamonds** is **Best in Show**.

**The loop.** On your turn you draw a second gem, so you're briefly holding two. You choose one to
play face-up — its effect resolves immediately — and keep the other as your new secret Showpiece.
Every gem's carat value (0–9) is also its effect:

- **Pink Diamond (9)** — no effect on its own, but being *forced* to discard it exposes you instantly.
- **Blood Ruby (8)** — a hard lock: if you're holding it alongside the 7 or the 5, you must play it.
- **Blue Sapphire (7) — The Trade** — swap Showpieces with a rival.
- **Green Emerald (6) — The Deep Vault** — draw two more, keep the best of three, return the rest.
- **Yellow Topaz (5) — The Recut** — force a Collector (or yourself) to discard and redraw.
- **Imperial Jade (4)** — go Under Glass: untargetable until your own next turn.
- **Black Opal (3) — The Private Appraisal** — compare Showpieces privately; lower carat is Exposed.
- **Purple Amethyst (2) — The Loupe** — secretly view a rival's Showpiece.
- **Clear Quartz (1) — The Scratch Test** — name a gem; guess right and you Expose the holder.
- **Raw Obsidian (0)** — worthless at the reveal, but the sole surviving Collector who played one
  banks a bonus Diamond.

Getting **Exposed** — a correct Scratch Test, a lost Private Appraisal, or a forced Pink Diamond
discard — knocks you out for the rest of that Showing. Your Showpiece stays visible for the reveal
even so.

**How a Showing ends.** Either only one Collector is left standing, or the Vault runs dry — **Vault
Lock**. Every Collector still in reveals their Showpiece; highest carat wins the Showing. Ties break
on whoever has the higher sum of their own discard pile.

**How it ends.** Winning a Showing earns one **Cut Diamond**. First to the target — 7 at three
players, 5 at four, or a custom number — is crowned **Best in Show**.

---

## T4 — Theme & Flavour · *free*

**The world.** A private jewel exhibition, glamorous and a little cutthroat — every Collector is
polite in public and quietly working an angle. The register is high-society heist rather than
courtroom: nobody is arrested, they're just *Exposed*, in front of everyone, which is its own
punishment at a table like this.

**The voice** leans into appraisal-house vocabulary throughout — *Showpiece*, *The Vault*, *Vault
Lock*, *The Appraiser's Ledger*, *The Showroom Journal* — so the mechanical language of a deduction
game reads as the natural vocabulary of an auction house, not a rules glossary bolted onto generic
cards. The Sylly Mode leans harder still: *The Counterfeit Run*, *forge*, *audit*, *authenticate*.

**Australian English throughout**, as everywhere in the suite — colour, not color; metric where
anything is measured at all.

**On theme:** carats, cuts, and the specific vanity of "the flawless one wins." Card art is
naturalistic gem photography rather than illustrated cartoons — every gem is genuinely trying to
look valuable, because the whole premise only works if a player can believe someone would want to
hold onto one.

**Off theme:** cops-and-robbers heist tropes, violence, or treating Exposure as a real accusation of
wrongdoing rather than a game beat. Nobody did anything wrong at this table — they just showed the
wrong gem.

---

## T5 — Terminology · *paired*

| Term | Meaning |
|------|---------|
| **Collector** | A player. |
| **Showpiece** | The one gem a Collector holds secretly at all times. |
| **The Vault** | The draw deck — shown as "N gems remaining." |
| **The Locked Lot** | The gems burned face-down (Smoke & Mirrors) at the start of each Showing — never seen by anyone. |
| **Vault Lock** | The Vault running dry — triggers the reveal; highest carat still held wins, ties break on discard sum. |
| **Exposed** | Out for the Showing — a correct guess against you, a lost Appraisal, or being forced to discard the Pink Diamond. |
| **Under Glass** | Untargetable until your own next turn (Imperial Jade's effect). |
| **The Showroom** | The table screen's static header title — Flawless has no rounds within a Showing, so the header names the place, not the turn. |
| **Exhibition N** | The Showing counter, shown beside The Showroom and on the result screen. |
| **The Appraiser's Ledger** | The table's public gem tracker — Tally, Discards, or Off. |
| **The Showroom Journal** | The public action log on the table screen. |
| **Cut Diamond** | Score currency — first to the target wins the session, "Best in Show." |
| **Showing** | One full deal — ends at Vault Lock or when only one Collector remains. |
| **The Counterfeit Run** | Sylly Mode — the bluffing/audit economy (see T8). |
| **Enter the Exhibition** | Menu Play CTA label. |
| **The Display Case 💎** | Settings overlay title. |
| **Another Showing?** | Play-again overlay heading. |
| **Pack Up Your Case?** | Quit overlay heading. |

### The 10 gems — carat, name and effect

| Carat | Name | In the Vault | What it does |
|---|---|---|---|
| 9 | Pink Diamond | 1 | No effect, but forced discard exposes you. |
| 8 | Blood Ruby | 1 | Must be played if held with the 7 or the 5 — no bluffing past it. |
| 7 | Blue Sapphire — The Trade | 1 | Swap Showpieces with a rival. |
| 6 | Green Emerald — The Deep Vault | 2 | Draw 2 more, keep the best of 3. |
| 5 | Yellow Topaz — The Recut | 2 | Force a Collector (or yourself) to discard and redraw. |
| 4 | Imperial Jade | 2 | Go Under Glass — untargetable until your own next turn. |
| 3 | Black Opal — The Private Appraisal | 2 | Compare privately; lower carat is Exposed. |
| 2 | Purple Amethyst — The Loupe | 2 | Secretly view a rival's Showpiece. |
| 1 | Clear Quartz — The Scratch Test | 6 | Name a gem; a correct guess Exposes the target. |
| 0 | Raw Obsidian | 2 | Worthless at Vault Lock, but the sole surviving Collector who played one earns a bonus Diamond. |

---

## T6 — Settings · *mixed — labels paired, values derived*

The settings overlay is titled **The Display Case 💎** — *"Set the scene before the first Showing."*

| Setting | Options | Default | What it does in play |
|---|---|---|---|
| **Appraiser's Ledger** | Tally / Discards / Off | Tally | Tally shows a running count of every gem seen; Discards shows the actual play order instead; Off is a pure memory game. |
| **Diamonds to Win** | Auto / Custom (3/5/7) | Auto | Auto picks the right target for the table size (7 at three players, 5 at four); Custom sets your own. |
| **Smoke & Mirrors** | 1 / 3 / 5 Gems | 1 Gem | How many random gems are burned out of the Vault each Showing — more burned, harder to read the deck. |
| **Appraisal Clock** | Off / 30s / 60s | Off | A gentle per-turn countdown; on time-out, your drawn gem is played for you. |
| **✨ Sylly Mode** | ON / OFF | OFF | The Counterfeit Run. See T8. |

**No word-difficulty tier.** Flawless runs off a fixed 21-card deck, not a `words.json` bank —
Smoke & Mirrors is the game's velocity dial instead.

---

## T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

### T7a — The flow

| # | Screen | Beat | Type | Duration | Chrome |
|---|--------|------|------|----------|--------|
| 1 | `screen-flw-menu` | Pick your poison | Menu | — | 🔊 |
| 2 | `screen-flw-table` | The Showroom — draw, place, resolve, repeat | Interactive | — | `[?]` 🔊 ✕ |
| 3 | `screen-flw-showing-result` | The reveal, Diamond tally, that Showing's Journal | Interactive | — | 🔊 ✕ |
| 4 | `screen-flw-gameover` | Best in Show | Result | — | 🔊 ✕ |

There is **no setup screen and no pass-gate** — names come from the lobby roster, and every player
is on their own phone with a private Showpiece, so there is nobody to hand a device to.

**Overlays**

| Overlay | Opened from | What it is |
|---|---|---|
| `flw-settings-overlay` | Menu | The Display Case — the five settings |
| `flw-how-to-overlay` | Menu, table `[?]` | How to Play — two tabs: The Rules, The Gems |
| `flw-target-overlay` | Table, playing Sapphire/Recut/Opal/Loupe | Choose a target — every Collector listed, ineligible ones greyed |
| `flw-scratch-overlay` | Table, playing Clear Quartz | The Scratch Test — pick a rival, then guess their gem |
| `flw-peek-overlay` | Table, after a Loupe or a wrongful-audit leak | The Loupe — press-and-hold reveal |
| `flw-appraisal-overlay` | Table, after a Black Opal comparison | The Private Appraisal — the outcome |
| `flw-emerald-overlay` | Table, playing Green Emerald | The Deep Vault — keep 1 of 3 |
| `flw-cf-overlay` | Table, Sylly Mode only | Forge a Gem — the Counterfeit claim picker |
| `flw-quit-overlay` | Table, showing-result ✕ | Mid-Showing quit confirm |
| `flw-new-showing-overlay` | Gameover | Play-again confirm |

### T7b — The words on screen

#### The menu

```copy
# screen-flw-menu
Flawless
The flawless one wins. Don't get exposed.
Enter the Exhibition
How to Play
Settings
← Back to the Box
```

#### The table

```copy
# screen-flw-table — labels
The Vault
Appraiser's Ledger
[?] Gem Manifest
The Showroom Journal
```

```copy
# screen-flw-table — action button and audit
Waiting…
Choose a gem to place
Audit
```

Header title, Vault count and cut count are built at runtime: *"The Showroom - Exhibition N"*,
*"N gems remaining"*, *"N gem(s) have been cut"*. The action button also reads *"Place [gem name]"*
or *"Discard (no effect)"* once a gem is selected, and *"Forge [gem name]"* / *"Keep a gem to
forge"* in Sylly Mode.

#### Target and effect overlays

```copy
# flw-target-overlay
Tap a jeweller to target.
Cancel
```

Heading is built per-gem — *"The Trade"*, *"The Recut"*, *"The Private Appraisal"* or *"The
Loupe"*. Each rival's row reads their name, or *"(yourself)"* on Topaz's self-target case, or
*"[Name] — Under Glass 🛡️"* when they're ineligible.

```copy
# flw-scratch-overlay
The Scratch Test
Name a rival and guess their gem.
Target
Guess
Make the Call
Cancel
```

```copy
# flw-peek-overlay
The Loupe
Press and hold to view their Showpiece.
Hold to reveal
Done
```

```copy
# flw-appraisal-overlay
The Private Appraisal
Got it
```

```copy
# flw-emerald-overlay
The Deep Vault 💚
Keep one. The other two return to the bottom of the Vault.
Confirm
```

```copy
# flw-cf-overlay
Forge a Gem
Claim any effect (1–7). Its effect fires for real — but it's a fake on the books.
Cancel
```

#### Showing result

```copy
# screen-flw-showing-result
Next Showing
```

Body is built at runtime — the result heading reads *"[Name] is the last one standing!"*,
*"[Name] wins the Vault Lock!"*, or *"Tied Vault Lock — [Names] share it."*; a Raw Obsidian bonus
line reads *"[Name] earns the Raw Obsidian bonus 💎"*; the readyCheck line reads *"Waiting on N
player(s) to view the results…"* on the host and *"Waiting for the host to start the next
Showing…"* on a client.

#### Gameover

```copy
# screen-flw-gameover
Best in Show 🏆
Another Showing?
```

The final Vault Lock reveal, when it's also the match-ending one, reads *"[Name] is Best in Show!
🏆"* on the same body the Showing-result screen already builds.

#### Settings — The Display Case

```copy
# flw-settings-overlay — title
The Display Case 💎
Set the scene before the first Showing.
```

```copy
# flw-settings-overlay — Appraiser's Ledger and Diamonds to Win
Appraiser's Ledger
Tally shows a running count of every gem seen. Discards shows the actual play order instead. Off is a pure memory game.
Tally
Discards
Off
Diamonds to Win
Auto picks the right target for your table size. Custom sets your own.
Auto
Custom
```

```copy
# flw-settings-overlay — Smoke & Mirrors and Appraisal Clock
Smoke & Mirrors
How many random gems are burned out of the Vault each Showing — more burned, harder to read the deck.
1 Gem
3 Gems
5 Gems
Appraisal Clock
A gentle countdown each turn. On time-out, your drawn gem is played for you.
Off
30s
60s
```

```copy
# flw-settings-overlay — Sylly Mode
✨ Sylly Mode
The Counterfeit Run
Each jeweller gets one Counterfeit gem to bluff any effect, plus two Audit Charges to expose rivals' fakes. Hold the fake to Vault Lock and it collapses to nothing.
Done
```

#### How to Play — The Rules

```copy
# flw-how-to-overlay — title and tabs
How to Play 💎
Hold the most flawless stone when the vault locks.
The Rules
The Gems
```

```copy
# flw-how-to-overlay — step headings and bodies
Draw and place
Draw one gem so you're holding two, then place one face-up and resolve its effect — keep the other as your secret Showpiece
Read your rival Collectors
Effects let you peek, compare, swap, or expose. Get Exposed — a correct guess, a lost appraisal, or being forced to discard the Pink Diamond — and you're out for this Showing.
Lock the Vault
When the Vault runs dry it's Vault Lock — every Collector still in reveals, highest carat wins. Or simply be the last one standing.
Winning and Scoring
```

```copy
# flw-how-to-overlay — Sylly Mode card
The Counterfeit Run
Everyone gets one Counterfeit gem to bluff any effect, plus two Audit Charges to expose a rival's fake. Get caught auditing a real gem and you leak your hand. Hold the fake to Vault Lock and it's worth nothing.
Got it
```

#### The Gems gallery

The gallery tab renders every gem through `flwRenderCard`, one card and description per row, built
from `FLW_GEM_EFFECT` — never hand-built markup, so it can never drift from the deck and is
skinnable along with everything else.

```copy
# flw-how-to-gems — per-gem effect copy
No effect — but you’re out if ever forced to discard it.
Must be played if held with the 7 or 5.
The Trade — swap Showpieces with a rival.
The Deep Vault — draw 2, keep the best of 3.
The Recut — a player (or you) discards and redraws.
Under Glass — untargetable until your next turn.
The Private Appraisal — lower carat is Exposed.
The Loupe — secretly view a rival’s Showpiece.
The Scratch Test — name a gem to Expose a rival (six in the deck).
Worthless at Vault Lock, but earns a bonus Diamond if you’re the sole Collector who played one.
```

#### Quit and confirms

```copy
# flw-quit-overlay
Pack Up Your Case?
You'll forfeit this Showing and leave the table.
Yeah, pack up.
Keep showing.
```

```copy
# flw-new-showing-overlay
Another Showing?
Tokens reset; everyone re-enters the lobby.
Another Showing
Stay here.
```

### T7c — Where the journey is thin

**◇ judgement, not spec.**

**Only four screens carry the whole session, and three of them are genuinely dense** — this is the
tightest Stack in the suite by screen count, which suits a Love Letter-shaped game well: nothing
about the source design has "rounds within a round" to give a fifth screen a reason to exist. The
trade-off is that the table screen alone carries the header, rival strip, Vault row, Ledger, Journal,
hand row, Counterfeit row and action button — a lot of information density for one Stack, mitigated
only by the fact a Showing is genuinely short.

**The showing-result screen has no per-Showing flavour of its own.** Every other repeating-round
screen in the suite that has had a Round Intro pass (Cookie Jar's Raid Intro, Counting Sheep's Night
Intro, Pecking Order's Clash Intro) opens the *next* round with a beat; Flawless's table screen
simply re-renders in place with no equivalent moment marking a new Showing beginning. It is a natural
next candidate for the suite-wide Round/Night Intro sweep tracked in `deferred-work.md`.

**The Counterfeit Run has almost no dedicated colour of its own.** Compared with Pecking Order's
Force of Nature (a full nine-event roster overlay) or Cookie Jar's Dibber Dobber (its own vocabulary
throughout T5), Flawless's Sylly Mode gets one settings card, one How to Play card, and a claim grid
— genuinely tight, functional copy, but nothing that reads as its own occasion the way the base
game's gem names do.

---

## T8 — Sylly Mode · *free*

**The Counterfeit Run.** Once per Showing, the active player may **forge** a claimed effect instead
of playing a genuine gem — the real gem they sacrifice stays hidden, and only the claimed gem appears
in the public Journal and Ledger. A forgery's lie reads as true right up until someone checks it.

**What can be forged.** Only carats 1–7. The Pink Diamond, Blood Ruby, and Raw Obsidian are excluded
— each of their effects fires on-deal or on-discard in a way a forgery can't fake convincingly, so
the Counterfeit Run is scoped to the seven gems whose only mechanic is a straightforward on-play
reveal.

**Auditing.** Every Collector gets two **Audit Charges** per Showing. Spending one authenticates a
rival's most recent claimed play — once per your own turn. Catch a genuine forgery and the forger is
Exposed on the spot, their Journal entry corrected to the real gem. Audit a play that turns out to be
genuine, though, and the accused gets to privately glimpse *your* own Showpiece in return — a
wrongful accusation costs the accuser real information.

**The stakes of holding a fake too long.** A forged gem that never gets played collapses to nothing
if you're still holding it at Vault Lock — a Counterfeit is worth playing, not hoarding.

**What changes in feel, not just rule.** The base game is a read on what someone *chose* to play;
The Counterfeit Run adds a second layer of doubt about whether what they played was even real. It
rewards a colder nerve than the base game — bluffing costs you an audit charge to catch, and catching
one wrong costs you your own secret in return, so accusing someone becomes its own gamble.

---

## T9 — Art & Assets · *derived*

**Flawless ships with real artwork by default** — a core art pack promoted from what began as a
skin pack (`prismatic-gems`), so most players have only ever seen it illustrated.

| What | Count | Where it renders |
|---|---|---|
| Gem card faces | 10 — the full deck, one per carat | Hand row, gallery, target/scratch/emerald overlays, the showing-result reveal |
| Card back | 1 | Face-down cards, wherever one is shown |

**Everything is precached.** The art is part of the app version, present on a cold offline install;
changing it needs a service-worker version bump. A CSS fallback token still renders if art ever
fails to load, so the game degrades rather than breaking.

**Where to see it without playing.** How to Play → **The Gems** shows the full deck, one row per
carat with its real card face and effect text. It's built through the same `flwRenderCard` seam the
table uses, so it can never drift from the live deck and is skinnable along with everything else.
Every row is tappable-to-enlarge. Opening this tab offline is the install check for a game with no
shared device — illustrated cards mean the art precached correctly, emoji mean it didn't.

Dimensions, file-size ceilings and the conversion process are **not** recorded here — they live in
`docs/art-authoring-guide.md`, the document to brief an artist from alongside T4.

---

## T10 — At the Table · *derived — except the PTP judgement*

**Modes.** Multi-device only. Every player uses their own phone; one person hosts and the rest join
with a room code. There is no pass-the-phone or shared-device option.

**Players.** 3 to 4 — the tightest player range in the suite, matching the source game's own sweet
spot.

**Devices.** One per player, no exceptions — every Showpiece is private and dealt over the private
Firebase channel, which a shared screen cannot preserve.

**Shape-changing settings.** None. No setting alters player count or session structure.

**How it plays at each size**

| Players | What it feels like |
|---|---|
| **3** | Sharper reads — with only two rivals, an effect against you narrows down fast, and a Scratch Test guess has better odds. |
| **4** | The fuller table — more Showpieces in play means more genuine uncertainty about who's holding what, and a Showing runs a little longer before the Vault empties. |

**Could it be Pass-the-Phone?** — ◇ *judgement, not spec*

**No, and this is the strongest case for it in the suite.** Flawless is, structurally, Love Letter —
a game whose *entire physical history* is pass-and-play. But the suite moved Showpieces to the
private Firebase channel specifically so that inspecting Firebase itself couldn't reveal a hand,
which is a genuinely stronger privacy guarantee than a shared phone can offer: a shared device means
every other player watches you look at your own gem before you choose. Building a PTP mode back in
would mean a Pass-the-Phone Safety Gate before every single reveal, which is a real cost, not a
config flag — but it is the one game in this suite where the *paper original* argues hardest for
trying anyway.

---
