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
