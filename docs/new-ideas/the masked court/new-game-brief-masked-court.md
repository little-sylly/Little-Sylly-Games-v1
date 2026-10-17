# New Game Brief — The Masked Court

**Document type:** Phase 1 — Design Brief (non-technical)
**Abbreviation:** `mask` · **Draft 2** · 15 October 2026
**Output file:** `docs/new-game-brief-masked-court.md`
**What happens next:** hand this to Claude Code with `new-game-technical-template.md` and the rule files for Stage 2.

---

## Status

| Field | Your answer |
|---|---|
| **Draft number and date** | Draft 2, 15 October 2026. The first draft on the consolidated template. |
| **Locked** | The concept (a Coup reskin set in a masked, secret gathering of the powerful, serious in tone); title **The Masked Court**; abbreviation `mask`; emoji 🎭; brand colour deep plum `#4A2352`; Match = The Ascendancy; Round = A Masque; Turn = Your Gambit; Ducats; Favour; Sovereign of the Masque / Sovereign of the Ascendancy; The Atelier; the five roles and their subtitles; the action names; Unmask! and Intercede; Unmasked and Ruined; the agreed flavour lines. |
| **Soft-locked** | The rest of the vocabulary (§9), scoring numbers, player range 2–8 (leave as is until the prototype and bots exist), settings, The Midnight Hour, the scripted Practice round, the role colours. |
| **Still open** | See "Open Questions & Locks". **No blockers.** Twelve non-blockers, the most worth discussing being the dark stage question (§11), the Confidence Man's subtitle (§10) and the PTP response window (§12). |
| **Supersedes an earlier version?** | Yes: Draft 1 (title The Masquerade, `masq`, claret brand colour), which was built on the older prompt file. |

**Terminology note.** The original's *influence cards* are **Masks**, its *coins* are **Ducats**, *block* is **Intercede**, *challenge* is **Unmask!**, *eliminated* is **Ruined**, and *coup* is **The Cut Direct**. The brief never uses the original's character or action names.

**Hard-rule check.** Nothing here needs a hard rule broken (browser only, no saved progress, no trademarks, Australian English, standard shells, Sylly Mode last). There are no `[DEVIATION]` items.

**Two cautions.** (1) Every `[ORIGINAL]` fact is recalled from memory of the published rules; check each against the rulebook before Stage 2. (2) This is a design brief, not legal advice; see the IP check in §1.

---

## 1. Identity

| Field | Your answer |
|---|---|
| **Full game name** (and why it works) | **The Masked Court.** A court is where power lives, and a masked one is where nobody can be trusted. It ties to the Sovereign titles and the main screen ("The Court"). Renamed from The Masquerade because the concept moved from a ball to a secret gathering, and because a published mask-bluffing game called *Mascarade* has almost the same name. |
| **Short abbreviation** | `mask`. Not in the taken list. |
| **Tagline** | "Every guest is masked. Every claim is a gamble." `[PLACEHOLDER]` Alternative: "Claim a Mask. Hold your nerve." |
| **Thematic universe** | A secret gathering of the powerful in a candlelit great house. Venetian carnival masks and Regency intrigue. Everyone smiles, everyone is hiding something. |
| **Emoji / icon** | 🎭 |
| **Brand colour** | Deep plum `#4A2352`, with white text at roughly 12:1 contrast. Audited against the suite's list; see §11. |
| **Core type** | Deduction / bluffing / social deception, with player elimination. |
| **The fun moment in 10 words** | "Calling 'Unmask!' on a bluff and watching the mask slip." |
| **Inspired by, and what changes** | Inspired by *Coup* (Indie Boards & Cards): two hidden characters, claims that may be false, challenges and blocks, last guest standing. What changes: the theme and all vocabulary; a series with Favour scoring; a larger player range (2–8, with a bigger Atelier for 7–8); a response window so every guest can answer on their own phone; hidden-Mask handling for mobile; bots; and a Sylly Mode. |
| **Overlap check** | Closest suite games: Fruit Salad (`frt`) and Flawless (`flw`), both bluffing games. Those are pass-and-declare: one guest hands a card on and the receiver judges it. Here every guest makes open claims about permanent hidden roles and the game ends in elimination. No existing suite game has persistent character claims or elimination, so it doesn't duplicate any. The bluffing genre overlap is moderate. |
| **IP and naming check** | Game rules aren't protected, but names, art and wording are. The brief uses none of the original's names, art or rule text; the role names, action names and title are original. A quick search found no published game titled "The Masked Court", though that is not a trademark search. Two outside games are worth knowing about: *Mascarade* (Bruno Faidutti, a mask-swapping bluffing game) and *Masques* (Fantasy Flight Games, a Venetian masquerade-ball card game that also uses ducats and court-favour wording). "Ducats" and "Favour" are generic, but check the vocabulary doesn't read as borrowed. |

---

## 2. The Players

| Field | Your answer |
|---|---|
| **Player count** | 2–8. Sweet spot 4–5. 7–8 is `[UNTESTED]` and may run long. Leave as is until the prototype and bots can be playtested. `[SOFT-LOCKED]` |
| **Minimum meaningful player count** | 3. Two guests works but plays differently (a duel of Ducat counts). |
| **Device mode(s)** | Both. MDLM is the main mode, since each guest's Masks stay private on their own phone. PTP is supported with gate screens (§12). |
| **Teams or individuals?** | Individuals. |
| **Are there different roles?** | None. Every guest is a plain guest holding two hidden Masks. |
| **Is any information hidden?** | Yes. Each guest's face-down Masks are hidden from everyone else, and so is the order of the Atelier. |
| **Bots / solo** | **Yes (planned).** A bot can fill any seat, and solo play against 1–7 bots is allowed. The registry minimum stays 2, and "playable solo against bots" is its own flag. See §22. |

**Roles:** none, so the roles table does not apply.

**Notes:** the five *characters* (§10) are Masks a guest may hold or claim, not player roles. The Atelier holds 3 copies of each character for 2–6 guests, or 5 copies for 7–8. `[MATHS]`

---

## 3. The Core Loop

**In one sentence, what does a player do on their turn?** On your Gambit you choose one action, either a plain one or one that claims a Mask you may not hold, and every other guest may Unmask you or Intercede before it takes effect.

**The central tension or fun moment:** the half-second after someone calls "Unmask!" and before the Mask is shown.

**Closest type:** ☒ Deduction / bluffing / social deception

**One complete round, step by step** (what each action does and who can stop it is in §4):
1. **Deal.** Each guest takes 2 Masks face down and 2 Ducats. The rest of the Masks form the Atelier. In a 2-guest game the first guest starts with 1 Ducat. `[ORIGINAL — verify]`
2. **Your Gambit.** The guest picks one action and, if needed, a target. At 10 or more Ducats the only action offered is The Cut Direct.
3. **The claim.** If the action needs a Mask, the guest says which one they are claiming, truthfully or not.
4. **Response window.** Every other live guest chooses **Unmask!** or **Let It Stand**.
5. **If someone calls Unmask!**
   - *The mask holds:* the claimant shows the Mask. The challenger surrenders a Mask. The shown Mask is shuffled into the Atelier and the claimant draws a fresh one. The action carries on.
   - *The mask slips:* the claimant can't show it. They surrender a Mask and the action is cancelled. Ducats paid for Scandalise are returned. `[ORIGINAL — verify]`
6. **Intercede.** If the action can be Interceded, the allowed guests may claim the stopping Mask. That claim can itself be Unmasked.
7. **Effect.** The action resolves. A surrendered Mask goes face up into **The Gallery**, where everyone can count it. A guest with no Masks is **Ruined**.
8. **Next guest**, clockwise.
9. **The Masque ends** when only one guest still holds a Mask.

**Simultaneous or sequential?** Sequential Gambits. The response window is simultaneous: every other live guest answers at once.

**How does the phone move?** MDLM: it doesn't, because every guest has their own. PTP: it stays on the table, and is passed only for private moments (glancing at your Masks, surrendering one, Assume a Guise).

---

## 4. Rule Interactions

### Actions

| Action | Claims | Cost | Effect | Can be Unmasked? | Can be Interceded? |
|---|---|---|---|---|---|
| **Take Your Due** | None | — | +1 Ducat | No | No |
| **Enforce Obligation** | None | — | +2 Ducats | No (no claim) | Yes: any guest, claiming The Patron |
| **The Cut Direct** | None | 7 Ducats | Target surrenders a Mask (their choice) | No | No |
| **Impose Tribute** | The Patron | — | +3 Ducats | Yes | No |
| **Scandalise** | The Siren | 3 Ducats | Target surrenders a Mask (their choice) | Yes | Yes: target only, claiming The Dowager |
| **Cozen** | The Confidence Man | — | Take 2 Ducats from the target (1 if they hold only 1) | Yes | Yes: target only, claiming The Confidence Man or The Maskwright |
| **Assume a Guise** | The Maskwright | — | Draw 2 from the Atelier, keep as many Masks as you hold, return the rest | Yes | No |

### Interceding

| Intercede claim | Stops | Who may | Can be Unmasked? |
|---|---|---|---|
| The Patron | Enforce Obligation | Any guest | Yes |
| The Dowager | Scandalise | The target only | Yes |
| The Confidence Man | Cozen | The target only | Yes |
| The Maskwright | Cozen | The target only | Yes |

An Intercede cannot itself be Interceded.

### Answers to the checklist
- **Closed loops:** none beyond claim-and-Intercede pairs.
- **Cross-group links:** none.
- **Dead ends:** The Dowager has no action of her own, only her Intercede. That is balanced by being the only answer to Scandalise. Take Your Due and The Cut Direct can't be stopped at all.
- **Wildcards:** none.
- **Special states:**
  - A guest at 10 or more Ducats must make The Cut Direct.
  - A guest with one Mask still draws 2 on Assume a Guise but keeps only 1.
  - A Ruined guest is an Onlooker; their Ducats return to the Coffers.
  - Cozen can't be aimed at a guest with 0 Ducats. `[ASSUMPTION]`

### Order of resolution
1. The action is declared.
2. Unmask window on the action's claim.
3. If the claim was proven (the mask holds), the challenger surrenders a Mask and the claimant swaps the shown Mask. If not (the mask slips), the claimant surrenders a Mask and the action ends there.
4. Intercede window.
5. Unmask window on the Intercede claim, with the same two outcomes.
6. The effect happens, unless an Intercede stood.
7. Ruin check.

### Edge rules
- **Double loss:** if a challenger loses and is also the target of a Scandalise that then goes ahead, they surrender a second Mask. This can Ruin them.
- **A failed Intercede that is Unmasked:** the Intercede is cancelled and the action proceeds. For Scandalise, the target surrenders a Mask for the false claim and another to the Scandalise.
- **Scandalise's Ducats:** spent if it is Interceded or if it goes ahead; returned if its own claim is Unmasked and the mask slips. `[ORIGINAL — verify]`
- **A guest Ruined mid-resolution** cancels any further effects aimed at them.
- **Two or more Unmask! calls at once:** in MDLM the first received wins, with ties broken by seat order after the actor. In PTP the table settles it by speaking. `[OPEN FOR BUILD]`

### Does anything change these relationships?
Sylly Mode (§8) does not change any relationship in this section. It only changes which Masks guests hold. Restated there.

---

## 5. Winning

| Field | Your answer |
|---|---|
| **How does a round end, and how does a game end?** | A Masque ends when exactly one guest still holds a Mask. The Ascendancy ends after the last Masque of the chosen length. |
| **How is the winner determined?** | The last guest holding a Mask is **Sovereign of the Masque**. The Favour leader after the final Masque is **Sovereign of the Ascendancy**. In a single-Masque game the winner takes only the Ascendancy title. |
| **Ties** | A Masque can't tie: only one guest acts at a time, so no single event Ruins the last two guests together. A tie on Favour at the end triggers a tiebreak Masque between the tied guests only, with a fresh deal. `[ASSUMPTION]` Alternative: share the title. |
| **Series structure** | A Single Masque, Three Masques (default) or Five Masques. The first guest is random in the first Masque, then rotates clockwise. |
| **Length** `[ASSUMPTION]` `[UNTESTED]` | One Masque about 5–10 minutes with 4 guests, longer with 7–8. A Three-Masque Ascendancy about 20–30 minutes. |
| **Stall guardrails** | A guest with 10 or more Ducats must make The Cut Direct. Nothing else can stall the game, because Take Your Due always adds a Ducat and can't be stopped. This is a fixed rule, not a setting. |

---

## 6. Scoring

Favour is awarded at the end of each Masque. `[MATHS]` `[UNTESTED]`

| What happened | Who gets points | Roughly how many | Notes |
|---|---|---|---|
| Won the Masque | Sovereign of the Masque | 3 Favour | |
| Last guest Ruined | Runner-up | 1 Favour | |
| Anyone else | — | 0 | |
| A guest leaves mid-Masque | The leaver | 0 | The others are placed as normal. |
| Host ends the session early | Nobody | 0 | No Favour for the unfinished Masque. |

**Does scoring feel balanced?** The numbers assume a Three-Masque Ascendancy where winning most Masques matters most. Alternative: scale Favour with player count (N−1 for the winner). Parked.

**Any outcomes where nobody scores?** Only an abandoned Masque.

---

## 7. Settings

There is no difficulty-style setting, because the game has no prompt complexity. Challenge lives in bot cunning and Sylly Mode. `[ASSUMPTION]`

| Setting name | What does it change? | Options | Default | Notes |
|---|---|---|---|---|
| **The Ascendancy** | How many Masques in the series | A Single Masque · Three Masques · Five Masques | Three Masques | |
| **Court Tempo** | Whether responses and turns have a time limit | Unhurried · Brisk | Unhurried | Brisk: 20 s to respond (silence is Let It Stand) and 60 s per turn (an idle turn is Take Your Due). `[UNTESTED]` |
| **Rival Cunning** | How well bots play | Debutante · Courtier · Grandee | Courtier | Only appears when bots are in the room. |
| **✨ The Midnight Hour** | Sylly Mode | Off · On | Off | Always last. |

**Locked or hidden in certain situations:** Court Tempo is MDLM only, and PTP is forced to Unhurried. Rival Cunning appears only with bots. Only the host changes settings in MDLM.

**Scale automatically with player count:** the number of copies of each Mask (3, or 5 for 7–8 guests). See §10.

**Fixed rules that are not settings:** opening Ducats (2); Scandalise (3 Ducats); The Cut Direct (7 Ducats, compulsory at 10); first-guest rotation; Favour 3/1/0.

**Alpha-only testing options** (not planned for the shipped game): forced-deal tool, game log, fast bot-vs-bot balance lab.

---

## 8. Sylly Mode

**Status:** ☒ Designed `[SOFT-LOCKED]`

| Field | Your answer |
|---|---|
| **Thematic name** | **✨ The Midnight Hour** |
| **In one sentence, what changes?** | After every 6th Gambit the Chime sounds, and every guest's random Mask is secretly swapped for one from the Atelier. `[MATHS]` |
| **New screens or phases?** | Yes: the Chime screen (a private reveal of each guest's new Mask, and a public "The Chime sounds"). |
| **Changes scoring?** | No. |
| **Changes the win condition?** | No. |

**The Chime in detail:** each surviving guest's random Mask (the guest doesn't choose) is returned to the Atelier, which is shuffled. A random Mask is drawn in its place and seen privately. The Atelier size never changes. Truthful claims and bluffs flip without anyone knowing.

**Special cases under the Chime:**
- It happens only between Gambits, never mid-resolution.
- The Gallery never changes, so counting it is still reliable. Only inference from earlier claims decays.
- Ruined guests don't take part. A guest with 1 Mask swaps it.
- Ducats, Favour and The Cut Direct are unaffected.
- The Chime counts completed Gambits, including quiet ones. A Gambit that Ruins a guest counts, and the Chime sounds after the Ruin.
- If the Masque is already decided, no Chime sounds.

**Hidden information (§12 question 7):** each guest sees only their own new Mask. Everyone else sees only that the Chime sounded. It stays hidden afterwards: the Court Record never lists swaps.

**Round flow:** a normal Masque, plus the Chime screen.

**Parked alternatives (not for now):**
- **Secret Society:** each guest also gets a hidden objective. Interesting; to revisit later.
- **Masks Change Hands:** each Chime, everyone passes one Mask left.
- **A Wicked Tide:** the Chime comes sooner each time.

**Alternative names:** The Last Dance, Unmasking Hour, Carnevale.

---

## 9. Thematic Vocabulary

Status key: **Locked** = agreed in brainstorm · **Soft** = working wording · **Placeholder** = check before the pre-build review.

| Generic term | What this game calls it | Status | Alternatives |
|---|---|---|---|
| Game | **The Masked Court** | Locked | The Veiled Court, Conclave of Masks |
| Match (series) | **The Ascendancy** | Locked | The Regency, The Dynasty |
| Round | **A Masque** | Locked | An Evening |
| Turn | **Your Gambit** | Locked | — |
| Coins | **Ducats** | Locked | — |
| Treasury | **The Coffers** | Soft | The Strongbox |
| Score / points | **Favour** | Locked | — |
| Cards | **Masks** | Locked | — |
| Deck | **The Atelier** | Locked | The Vault |
| Pile of revealed cards | **The Gallery** | Soft | The Fallen, The Mantel |
| Lose a card | **Unmasked** | Locked | — |
| Eliminated | **Ruined** | Locked | Exiled |
| Round winner | **Sovereign of the Masque** | Locked | — |
| Match winner | **Sovereign of the Ascendancy** | Locked | — |
| +1 action | **Take Your Due** | Locked | — |
| +2 action | **Enforce Obligation** | Locked | Call In a Debt |
| +3 action | **Impose Tribute** | Locked | — |
| Assassinate | **Scandalise** | Locked | Traduce, Besmirch |
| Steal | **Cozen** | Locked | — |
| Exchange | **Assume a Guise** | Locked | Don Another Face |
| Coup | **The Cut Direct** | Locked | Expel |
| Challenge | **Unmask!** | Locked | — |
| Block | **Intercede** | Locked | — |
| Pass on responding | **Let It Stand** | Soft | Say Nothing |
| Challenge won / lost | **The mask holds / The mask slips** | Soft | — |
| Game over screen (a Masque) | **The Reckoning** | Soft | Dawn Breaks |
| Game over screen (the Ascendancy) | **The Final Reckoning** | Soft | The Final Accounting |
| Play again | **Convene Again** | Soft | Another Masque |
| Quit | **Slip Away?** | Soft | Leave the Masque? |
| Settings overlay title | **The Invitation ✉️** | Soft | Articles of the Ascendancy 📜 |
| Play button (game menu) | **Enter the Court** | Soft | Take Your Mask |
| Main play screen | **The Court** | Soft | The Salon |
| Public log | **The Court Record** | Soft | The Chronicle |
| Lobby | **The Antechamber** | Placeholder | The Foyer |
| Room code | **Passphrase** | Placeholder | — |
| Host | **The Convener** | Placeholder | The Host |
| Spectator (Ruined guests) | **Onlooker** | Soft | Bystander |
| Peek at own Masks | **Glance at Your Masks** | Soft | — |
| Private screen (PTP) | **Eyes Only** | Soft | — |
| Sylly event | **The Chime** | Soft | The Midnight Toll |
| Sylly Mode | **✨ The Midnight Hour** | Soft | The Last Dance, Unmasking Hour |

**Setting names and option labels**

| Setting | Name on screen | Option labels |
|---|---|---|
| Series length | The Ascendancy | A Single Masque · Three Masques · Five Masques |
| Time limits | Court Tempo | Unhurried · Brisk |
| Bot strength | Rival Cunning | Debutante · Courtier · Grandee |
| Sylly Mode | ✨ The Midnight Hour | Off · On |

**Deliberately plain terms:** none. Everything on screen is themed, except the suite's standard menu labels (How to Play, Settings, Back to the Box) and the Practice tab.

**Retired terms (do not reintroduce):** The Masquerade (as the title), Masquerade Ball, Gala, Ball, Season (as the match term), Last Mask Standing, Pin Money, Accolades, Toast of the Ball, Seals, Pickpocket, Swindler, Fleece, Lift a Purse, Poisoner, Mask Maker, Reforge, Take Due, Levy Tribute, Call in a Favour, Seek Patronage, Compromise, Cut In, Cloakroom, Struck from the List, Escorted Out, The Velvet Beauty, The Open Hand, The Long Memory, and the original attendee list (Monarch, Duke/Duchess, Count, Knight, Dancer, Cannon, Soldier, Jester).

**Quit confirm copy:** heading "Slip Away?" · confirm button "Slip away" · cancel button "Stay at court". `[PLACEHOLDER]`

---

## 10. Word Bank & Content

| Field | Your answer |
|---|---|
| **Uses the existing word bank?** | No. |
| **What kind of content does it need?** | The five characters (names, subtitles, actions, flavour lines). |
| **Needs a completely new data file?** | Yes, a small one. |
| **Any words or topics to exclude?** | None. |

**Example entry (The Patron):**
- **Name:** The Patron · **Subtitle:** *The Silver Hand*
- **Action:** Impose Tribute (+3 Ducats)
- **Intercedes against:** Enforce Obligation
- **Colour and symbol:** silver, signet ring
- **Flavour (acting):** "This house will have its due."
- **Flavour (Intercede):** "Every obligation in this room runs through me."

**All five characters:**

| Role | Subtitle | Action | Intercedes against |
|---|---|---|---|
| The Patron | *The Silver Hand* | Impose Tribute (+3) | Enforce Obligation |
| The Siren | *The Velvet Voice* | Scandalise (3 Ducats) | — |
| The Confidence Man | *The Gilded Tongue* | Cozen (take 2) | Cozen |
| The Maskwright | *The Faceless* | Assume a Guise (exchange) | Cozen |
| The Dowager | *The Immaculate* | — | Scandalise |

**Flavour lines** (the agreed set; the Siren's line and the Maskwright's action line are the latest):

| Moment | Line |
|---|---|
| Take Your Due | "I collect only what is mine." |
| Enforce Obligation | "You will recall what you owe me." |
| Impose Tribute | "This house will have its due." |
| The Patron intercedes | "Every obligation in this room runs through me." |
| Scandalise | "One dance, and you will tell me everything. By dawn, so will they." |
| The Dowager intercedes | "I buried better schemers than you." |
| Cozen | "Your trust does you credit. And me." |
| The Confidence Man intercedes | "I have played that game far longer than you." |
| Assume a Guise | "A new face, and I am someone else entirely." |
| The Maskwright intercedes | "I know every hand in this room." |
| Unmask! succeeds (the mask slips) | "That face was never yours." |
| Unmask! fails (the mask holds) | "You mistake me for a lesser guest." |
| Losing a Mask | "A face once seen cannot be unseen." |
| Ruined | "Your name will not be spoken here again." |
| The Cut Direct | "I do not believe we have met." |
| A Masque won | "The Masque is yours." |
| The Ascendancy won | "The Ascendancy is yours." |

**Quantity by player count:**

| Guests | Copies of each Mask | Total Masks | Dealt | Atelier after dealing |
|---|---|---|---|---|
| 2 | 3 | 15 | 4 | 11 |
| 3 | 3 | 15 | 6 | 9 |
| 4 | 3 | 15 | 8 | 7 |
| 5 | 3 | 15 | 10 | 5 |
| 6 | 3 | 15 | 12 | 3 |
| 7 | 5 | 25 | 14 | 11 |
| 8 | 5 | 25 | 16 | 9 |

**Content generation rules:** none (the set is fixed). **Not built yet:** expansion characters (see §19).

---

## 11. Custom Visual Assets

### Colours and accessibility

| Role | Name | Hex | Notes |
|---|---|---|---|
| Brand colour | Deep plum | `#4A2352` | The only colour for buttons, pills and toggles. White text at about 12:1. |
| Brand pressed | Dark plum | `#361840` | Pressed and disabled states `[PLACEHOLDER]` |
| Brand edge | Lifted plum | `#7D4A8B` | A 1 px top highlight so buttons read against a dark stage `[PLACEHOLDER]` |
| Stage | Midnight | `#14111C` | `[PLACEHOLDER]` See "Dark stage" below. |
| Panel | Dusk | `#241C2E` | |
| Text | Ivory | `#F3EBDD` | |
| Ducats | Gilt | `#C9A24B` | Board accent only, never on buttons. Also the Confidence Man's colour: gold means money and the con. |
| The Patron | Silver | `#A9B2BE` | Symbol: signet ring |
| The Siren | Velvet crimson | `#B3263E` | Symbol: rose |
| The Confidence Man | Gilt | `#C9A24B` | Symbol: top hat |
| The Maskwright | Verdigris | `#2F7F86` | Symbol: blank, featureless mask. Replaces the old indigo, which sat too close to the brand plum. |
| The Dowager | Pearl | `#EFE6D2` | Symbol: folded fan |

**Brand colour audit** (against the suite's current list):
- **Great Minds** (violet and purple pills) is the nearest hue, but far lighter.
- **Counting Sheep** (midnight `#3A3D52`) is similarly dark but a grey-blue.
- **Pass** (near-black) is the other very dark brand colour. At small sizes the plum's purple tint is the only difference, so check it on a real phone.
- It is nowhere near the red and pink games (Like I'm Five, Late to the Party, Bailed, Flawless, Pecking Order).

**Dark stage:** the plum is very dark. On the dark Midnight stage its buttons would nearly vanish: the contrast between button and stage is only about 1.5:1, even though white text on the button is about 12:1. My pick is a thin lifted-plum edge on every button. Alternative: a lighter stage. See Open Questions.

**Colour-blind check:** no gameplay pair relies on red versus green. Silver, gilt and pearl are all light, so shape and name carry the difference. Every Mask has its own symbol and its name, so colour is never the only cue.

**Accessibility:** minimum text size 14 px on a phone; reveal animations can be skipped.

**Colour tokens to add to the suite's design doc:** brand, brand pressed, brand edge, stage, panel, ivory text, gilt, and the five role colours.

**Reference mockups:** none.

### The repeated visual primitive

| Field | Your answer |
|---|---|
| **Is there a repeated visual primitive?** | Yes: the Masks. |
| **How many distinct faces/types?** | 5, plus a back. |
| **Skinnable with custom art later?** | Maybe. Build it asset-pack ready. |
| **Default look for v1** | Five fully illustrated portraits, which is a small art budget. |

Skins are cosmetic and device-local. Ids stay fixed across skins. A lobby could mix skins across players. `[ASSUMPTION]`

**Compact display:** a guest's two Masks sit side by side, never overlapping, so the full face shows. The Gallery uses small role-symbol chips with counts, so no portrait detail is needed at small sizes.

### Art inventory

| Image | How many | Size on a phone | Shape | Default or optional |
|---|---|---|---|---|
| Mask portraits | 5 | About 100×140 px in hand | Portrait card | Default look |
| Mask back | 1 | Same | Portrait card | Default look |
| Role symbols | 5 | 28 px | Square | Default look (single-colour glyphs) |
| Player crests | 8 | 40 px | Square | Default look (could be drawn by code) |
| Court backdrop | 1 | Full screen | Seamless texture | Default look, very quiet |
| Wordmark | 1 | Title screen | Wide | Default look |
| Ruined overlay | 1 | Over a guest's panel | Square | Default look (cracked mask outline) |

- **Where art is seen largest:** tapping a Mask in How to Play opens it full screen at about 300×420 px, so draw at double that.
- **Text the game draws itself:** names, subtitles, flavour lines, Ducat counts, Favour tallies and button labels. The art must not paint any of them in.
- **Drawn by code, no images:** Ducats (a circle with an embossed D), the Favour marker (a ribbon), and the Gallery counters.
- **Readability at the smallest size:** pieces on the dark court need a dark outline and a light top edge. Each role needs a different silhouette, not only a different colour.
- **Tiled or board art:** only the backdrop tiles.
- **Names stay separate from pictures:** a skin may change how a Mask looks, but the names and ids are permanent.

---

## 12. Multiplayer Classification

| # | Question | Your answer |
|---|---|---|
| 1 | Own device or shared? | Both modes are supported. MDLM is primary, with each guest on their own phone. PTP uses one shared phone. Individuals only; no teams. |
| 2 | Private information? | Each guest's face-down Masks, the order of the Atelier, the Masks drawn during Assume a Guise, the replacement Mask after a proven claim, and the Chime's swaps. None of these may ever reach another guest's device. |
| 3 | Simultaneous moments? | One guest acts at a time. Then every other live guest responds together (Unmask!, Intercede or Let It Stand). The game waits for every live guest to respond, or for the timer in Brisk. It also waits for a guest who must surrender a Mask. |
| 4 | Moments where one device is locked while another is active? | Yes. While a guest is choosing which Mask to surrender or which Masks to keep, everyone else sees "[Name] is choosing" and can't act. |
| 5 | What does a waiting guest see? Spectators? | The public table: Ducats, Mask counts, the Gallery, and the Court Record. They can still respond in the response window. A Ruined guest becomes an Onlooker, seeing only what everyone sees, never any live guest's hidden Masks. No TV view is planned. |
| 6 | Roles or phases that don't work multi-device? | None. PTP needs extra gate screens, but nothing is impossible. |
| 7 | Settings or events that hide information? | The Chime (Sylly Mode): each guest privately sees only their own new Mask. In PTP an Eyes Only gate covers the reveal; in MDLM it is on their own phone. It stays hidden afterwards. |
| 8 | PTP vs MDLM differences? | Only the host changes settings in MDLM. Court Tempo timers can't work in PTP, so it is forced to Unhurried. In PTP the table speaks aloud and the phone-holder taps who called Unmask! or Intercede `[OPEN FOR BUILD]`. Gate screens exist only in PTP. |
| 9 | Someone leaves mid-game? | Their Masks are shown in the Gallery and their Ducats return to the Coffers. Their Gambit is skipped, and any pending response counts as Let It Stand. A bot may take the seat `[OPEN FOR BUILD]`. If only one guest is left, they are Sovereign of the Masque. If the host leaves, the session ends for everyone. |
| 10 | Rejoin and late joining? | A guest who dropped can rejoin their seat within 60 seconds `[OPEN FOR BUILD]`. No late joining once a Masque has started. |
| 11 | Computer opponent? | Yes, planned. See §22. |

---

## 13. Screens — Plain English List

1. **Game menu:** Enter the Court, How to Play, Settings, Back to the Box.
2. **Setup:** names, seats and bots (PTP), or the Antechamber with the Passphrase (MDLM). `[PLACEHOLDER]`
3. **The Invitation** (settings overlay)
4. **Opening deal:** glance at your Masks.
5. **Eyes Only gate** (PTP)
6. **The Court:** guests, Ducats, Mask counts, the Gallery
7. **Your Gambit:** choose an action; costs shown, unaffordable actions greyed, The Cut Direct forced at 10 Ducats
8. **Choose a target**
9. **Response window:** Unmask! / Intercede / Let It Stand
10. **Unmask resolution:** the mask holds / the mask slips
11. **Surrender a Mask**
12. **Assume a Guise:** keep N of M Masks
13. **Ruined notice and Onlooker view**
14. **The Chime** (Sylly Mode only)
15. **The Reckoning** (end of a Masque)
16. **The Final Reckoning** (end of the Ascendancy)
17. **How to Play overlay**
18. **Rule Reference overlay**
19. **Practice tab**
20. **Slip Away?** confirmation
21. **Leave and rejoin notices**
22. **The Court Record** (a public history overlay)
23. *Alpha only, not planned for the shipped game:* game log with hidden information, forced-deal tool, balance lab

**History:** the Court Record lists public events only: claims, Unmask! calls, outcomes, surrendered Masks and Ruin. It never lists hidden Masks (except those shown in a challenge), and it shows only "The Chime sounds", never the swaps.

---

## 14. Complex Interaction / UI Spec

N/A — every turn is tap-to-choose. The one multi-selection, Assume a Guise, is a keep-N pick in the slide-up panel with a confirm button, since it can't be undone.

---

## 15. Rule Reference / In-Game Cheat Sheet

| Field | Your answer |
|---|---|
| **What reference material do players need mid-game?** | The action table: what each action does, what it claims, and who can stop it. |
| **How do they access it?** | A tap on the rules icon in the header of The Court. |
| **Does it interrupt the game?** | No. It is a non-blocking overlay. |
| **Static image, or rendered from data?** | Rendered from data, so it always matches the rules. |
| **Per-skin version?** | No. It uses role symbols, which are the same in every skin. |

**Layout** (plain-text sketch; arrows point from an action to what can stop it):

```
YOUR GAMBIT — choose one
Take Your Due ........ +1            (nothing to challenge)
Enforce Obligation ... +2            ← The Patron may Intercede (any guest)
The Cut Direct ....... pay 7         (cannot be stopped; compulsory at 10)
Impose Tribute ....... +3   claim: The Patron
Scandalise ........... pay 3  claim: The Siren       ← The Dowager (target)
Cozen ................ take 2 claim: The Confidence Man
                                      ← The Confidence Man or The Maskwright (target)
Assume a Guise ....... exchange  claim: The Maskwright
Any claim, and any Intercede, can be Unmasked!
```

It is the same scrollable slide-up overlay as How to Play.

---

## 16. Sound Design

- **Register:** hushed and candlelit, like a secret meeting in a grand house.
- **Tempo and energy:** slow and steady, quiet enough to sit under conversation for ten minutes or more.
- **Must never do:** no countdown ticks, alarms or sonar pings, no jolly waltz, nothing that sounds like a notification.
- **Lead instrument:** harpsichord (plucked, a little hollow), with low strings. It may collide with another game's classical track, so check against the suite.
- **Does Sylly Mode earn its own track?** Yes. The Midnight Hour changes how it feels to sit at: the same music detunes into a music-box waltz.

| Moment | Sound direction |
|---|---|
| Unmask! | A mask clatters on marble |
| The mask holds | A soft, felt thud |
| The mask slips | A porcelain crack |
| The Cut Direct | A door closing |
| The Chime | A single clock bell |
| Ruined | A mask shattering |
| Ducats | Reuse the suite's coin sound if there is one |

---

## 17. End Screen Content Mockup

**The Reckoning** (end of a Masque, illustrative):

```
THE RECKONING
Sovereign of the Masque: Cleo  👑   "The Masque is yours."
Order of ruin: Dev → Ben → Ada
Favour this Masque:  Cleo +3 · Ada +1 · Ben 0 · Dev 0
Favour so far:       Cleo 3 · Ada 1 · Ben 0 · Dev 0
[ Convene Again ]  [ Slip Away? ]
```

**Variants:**
- **A draw or tie:** impossible in a Masque. A tie on Favour at the end shows "A tiebreak Masque will decide it" and lists the tied guests.
- **A series win:** The Final Reckoning, with the line "The Ascendancy is yours." and the full Favour table.
- **A win decided by a closing clock:** none.
- **A forfeit:** "The court empties." The remaining guest is Sovereign.

**Short games:** in a Single Masque the Favour table adds nothing, so it is hidden and only Sovereign of the Ascendancy is shown.

---

## 18. How to Play — Teaching Points

1. **Your Masks and Ducats.** Two hidden Masks and 2 Ducats.
2. **Your Gambit.** One action per turn.
3. **The five Masks.** What each can claim.
4. **Unmask!** Call a bluff. Win and they surrender a Mask; lose and you do.
5. **Intercede.** Stop an action by claiming a Mask.
6. **Ruin.** Scandalise and The Cut Direct. Lose both Masks and you're Ruined.
7. **Winning and Scoring** (the card title is exactly that).
8. **✨ The Midnight Hour** (the Chime).

**Easy-to-miss exceptions to flag in the copy:**
- A proven claim swaps the shown Mask for a fresh one.
- An Intercede is itself a claim and can be Unmasked.
- Only the target may Intercede Scandalise and Cozen, but any guest may Intercede Enforce Obligation.
- At 10 Ducats you must make The Cut Direct.
- Surrendered Masks stay face up in the Gallery, so you can count them.

---

## 19. Open Questions & Design Notes

**Decisions log** (no `[DEVIATION]` items):
- Coup was chosen as the reskin because bluffing is the heart of the theme.
- The original attendee list (Jester and the rest) was dropped, since Coup has no "weakest beats strongest" rule.
- The Poisoner was rejected as tacky and replaced by a seductress who ruins people through scandal.
- The pickpocket became a smooth deceiver, The Confidence Man.
- The mask-maker became the mysterious Maskwright, with "The Faceless" as a subtitle.
- Seals was dropped because Hide and Shogun uses it, so points are Favour.
- The tone moved from a party to a masked, serious, secret gathering.
- Renamed from The Masquerade to **The Masked Court**: the concept moved away from a ball, and the old title was close to the published game *Mascarade*.
- The brand colour moved from claret to deep plum, because claret sat too close to the other red games.
- The Siren's subtitle is **The Velvet Voice**, since a beauty makes no sense under a mask.
- Secret Society (a Sylly Mode idea) is parked for later.
- The Practice tab is one scripted round, not a lesson picker.
- Player count stays 2–8 until the prototype and bots can be playtested.

**Balance and tuning:**

| Item | Value | Evidence |
|---|---|---|
| Starting Ducats and action costs | 2 / 3 / 7 | `[ORIGINAL]` |
| Copies of each Mask (3, or 5 for 7–8 guests) | | `[MATHS]` for 7–8 |
| Favour 3 / 1 / 0 | | `[MATHS]` `[UNTESTED]` |
| Chime every 6 Gambits | | `[MATHS]` `[UNTESTED]` |
| Brisk timers 20 s / 60 s | | `[UNTESTED]` |

**Risks to playtest:**
- The response window slowing the pace on phones.
- PTP friction.
- Long waits for Ruined guests at 7–8 players.
- Whether Unmask! feels dramatic enough on a small screen.
- Whether bots at Grandee are too strong.

**Things that might be complicated to implement:**
- Collecting simultaneous responses fairly (§4).
- The PTP response flow.
- Routing hidden information to one device only.
- The Chime's private reveals.

**Parked ideas:** Secret Society; The Phantom, as a darker alternative to The Siren; The Plague Doctor, as an expansion character; a Jester-style "fool beats king" variant; team play; a TV view for onlookers; a "Masks per guest" setting; an escalating Chime.

**Out of scope for v1:** expansion characters, teams, a TV view, persistent statistics.

**Preferences and general notes:** no preference on how skins are chosen.

---

## 20. Mood & References

| Field | Your answer |
|---|---|
| **Real-world games most similar** | *Coup* (the base); *Mascarade* (masks and bluffing); in the suite, Fruit Salad and Flawless. |
| **References, and what each is for** | Venetian Carnevale masks: shape language and silhouettes, not copying any specific mask. The masked-ball scene in *The Phantom of the Opera*: the tension of hidden identities, not its costumes, music or imagery. Regency costume dramas: colour, candlelight and pacing, not the romance tone. Dutch Golden Age portraits: dark, warm, dramatic lighting. |
| **Tone** | Tense, sly, serious. |
| **Should NOT feel like** | A kids' carnival, a Halloween game, slapstick, or glitter. |
| **Example phrases already written** | The flavour lines in §10. |

---

## 21. Sample Round

### Sample 1: a standard Masque (MDLM, four guests)

**Setup.** Ada, Ben, Cleo and Dev each have 2 Ducats (8 in all). The Atelier holds 7 Masks.

| Guest | Masks |
|---|---|
| Ada | Patron, Siren |
| Ben | Confidence Man, Dowager |
| Cleo | Maskwright, Patron |
| Dev | Siren, Dowager |

The Atelier: Patron 1, Siren 1, Confidence Man 2, Maskwright 2, Dowager 1. Ada goes first.

| # | Guest | What happens | Ducats (Ada / Ben / Cleo / Dev) |
|---|---|---|---|
| 1 | Ada | **Impose Tribute** (claims The Patron, true). Everyone lets it stand. | 5 / 2 / 2 / 2 |
| 2 | Ben | **Cozen** Ada (claims The Confidence Man, true). Ada **Intercedes** claiming The Maskwright (a bluff). Cleo calls **Unmask!** Ada can't show one: the mask slips. She surrenders her Patron (to the Gallery). The Intercede fails and Ben takes 2. | 3 / 4 / 2 / 2 |
| 3 | Cleo | **Assume a Guise** (claims The Maskwright, true). Nobody challenges. She draws Dowager and Confidence Man, keeps Patron and Dowager, and returns Maskwright and Confidence Man. | 3 / 4 / 2 / 2 |
| 4 | Dev | **Enforce Obligation** (+2). Cleo **Intercedes** claiming The Patron (true). Dev calls **Unmask!** Cleo shows the Patron: the mask holds. Dev surrenders a Dowager, and Cleo's Patron is shuffled into the Atelier while she draws a Maskwright. The Intercede stands. | 3 / 4 / 2 / 2 |
| 5 | Ada | **Scandalise** Dev (claims The Siren, true), paying 3. Ben calls **Unmask!** and Ada shows the Siren: the mask holds. Ben surrenders a Confidence Man. Ada's Siren is shuffled in and she draws a Patron. Dev has no Dowager and lets it stand, so he surrenders his last Mask (Siren) and is **Ruined**. His 2 Ducats go to the Coffers. | 0 / 4 / 2 / — |
| 6 | Ben | **Impose Tribute** (claims The Patron, a bluff). Cleo calls **Unmask!** Ben can't show one: the mask slips. He surrenders his last Mask (Dowager) and is **Ruined**. His 4 Ducats go to the Coffers. | 0 / — / 2 / — |
| 7 | Cleo | **Take Your Due**. | 0 / — / 3 / — |
| 8 | Ada | **Impose Tribute** (The Patron, true). Cleo lets it stand. | 3 / — / 3 / — |
| 9 | Cleo | **Scandalise** Ada (claims The Siren, a bluff), paying 3. Ada calls **Unmask!** Cleo can't show one: the mask slips. She surrenders her Maskwright. Her 3 Ducats are returned. `[ORIGINAL — verify]` | 3 / — / 3 / — |
| 10 | Ada | **Scandalise** Cleo (claims The Siren, a bluff), paying 3. Cleo **Intercedes** claiming The Dowager (true). Ada calls **Unmask!** Cleo shows the Dowager: the mask holds ("I buried better schemers than you."). Ada surrenders her last Mask and is **Ruined**. | 0 / — / 3 / — |

**Result.** Cleo is Sovereign of the Masque. Favour: Cleo 3, Ada 1 (the last Ruined), Ben 0, Dev 0. The next Masque starts with Ben.

**Arithmetic checks:**
- **Ducats.** The 8 starting Ducats plus the 3 from Tribute make 11 after turn 1 (5+2+2+2). They stay at 11 through turns 2–4 (3+4+2+2 each time).
- **Masks after turn 6.** 3 are in hands (Ada's Patron, Cleo's Dowager and Maskwright) and 5 are in the Gallery (Patron, Dowager, Confidence Man, Siren, Dowager). The Atelier holds 7. 3 + 5 + 7 = 15.
- **Copies by role after turn 6.**

| Role | Gallery | Hands | Atelier | Total |
|---|---|---|---|---|
| Patron | 1 | 1 | 1 | 3 |
| Siren | 1 | 0 | 2 | 3 |
| Confidence Man | 1 | 0 | 2 | 3 |
| Maskwright | 0 | 1 | 2 | 3 |
| Dowager | 2 | 1 | 0 | 3 |

### Sample 2: hidden information (PTP, turn 3 from Sample 1)
1. The phone sits on the table. It shows "Pass to Cleo — Eyes Only".
2. Cleo holds to glance at her Masks. They hide again on release.
3. She taps **Assume a Guise**. The table hears the claim, and the phone asks "Does anyone call Unmask!?" Nobody does.
4. The Eyes Only gate appears again. Cleo sees four Masks (her two and the two drawn), keeps two and confirms. The Atelier shuffles.
5. The Court Record shows only "Cleo assumed a Guise", never which Masks. In MDLM this all happens on Cleo's own phone; others see only "Cleo is choosing".

### Sample 3: The Midnight Hour (three guests)
After the 6th Gambit the Chime sounds. Ada held Patron and Siren, and her random Mask (the Siren) is swapped for a Dowager from the Atelier. She privately sees Patron and Dowager. Ben swaps a Dowager for a Maskwright. Everyone sees only "The Chime sounds". Ada's next Scandalise would now be a bluff, though she planned it as true, and Ben's earlier claims no longer tell anyone anything.

### Sample 4: edge cases
- **Forced Cut Direct.** Ben starts a Gambit with 10 Ducats, so the only action offered is The Cut Direct. He pays 7, leaving 3, and the target surrenders a Mask of their choice.
- **Double loss.** Ada has two Masks and Unmasks Ben's true Scandalise aimed at her. The mask holds, so she surrenders one Mask for the challenge. The Scandalise then goes ahead, so she surrenders the other and is Ruined.
- **A guest leaves.** Ben's Masks go to the Gallery, his Ducats go to the Coffers and play carries on with his Gambit skipped.

### Mini-scenarios

| Piece | Scenario |
|---|---|
| The Patron | A bluffed Tribute that gets Unmasked costs a Mask and gains nothing. |
| The Siren | Scandalise Interceded by a true Dowager costs the 3 Ducats. |
| The Confidence Man | Cozen against a guest with 1 Ducat takes 1. A guest with 0 can't be chosen. |
| The Maskwright | A guest with 1 Mask draws 2 and keeps 1. |
| The Dowager | A bluffed Intercede that is Unmasked costs a Mask, and the Scandalise then costs another. |
| The Cut Direct | Pay 7. Cannot be Unmasked or Interceded. |

### Sample 5: a bot turn
Lady Vesper (a Courtier bot) holds Siren and Dowager, with 4 Ducats. She sees only public information: the Gallery already shows two Dowagers, so she knows she holds the last one and that nobody else can. She Scandalises the guest with the most Ducats, claiming the Siren truthfully, and never uses anything under another guest's Masks.

---

## 22. Bots

*(An intent at this stage. After the alpha it becomes a record.)*

- **Goal and scope:** solo play, filling seats and testing. A bot can fill any seat, in MDLM or PTP.
- **Who and where:** bots are named for the court (placeholders: Lady Vesper, Count Orsini, The Marquise). They are chosen in setup, with a short pause between moves so they can be followed, and they need no gate screens.

| Level | Behaviour |
|---|---|
| **Debutante** (Easy) | A random legal move. Seldom bluffs, challenges by chance. |
| **Courtier** (Medium) | Counts the Gallery. Bluffs only plausible claims. Unmasks when a claimed role is nearly all revealed. |
| **Grandee** (Hard) | Weighs every guest's likely Masks from public information (Gallery, claim history, outcomes). Plans Ducats around The Cut Direct. Bluffs on purpose. |

- **What the bot may know:** its own Masks, the Gallery, claims, and Ducat counts. It must never read another guest's hidden Masks or the Atelier's order. It can count the Gallery perfectly, where a human may slip. This is an information imbalance to watch. `[OPEN FOR BUILD]`
- **Other phases:** Assume a Guise and the Chime are handled by the same rules.
- **How the behaviour was chosen:** to be recorded after the alpha.
- **Testing:** legality (it only plays legal moves and never reads hidden information); a strength ladder `[SIM]`; results against humans `[PLAYTEST]`. All to come.
- **Sylly Mode and bots:** the bot plays it, and its belief in its own and others' Masks decays at each Chime.
- **Dropped players:** a bot may take over a vacated seat. `[OPEN FOR BUILD]`
- **Known limits:** it may be too strong at Grandee, it has no personality yet, and it is not yet connected to the suite's lobby and bot system.

---

## 23. Hints & Tips

**Strategy `[ORIGINAL]`** (from memory of the original; verify):
- **Beginner:** Take Your Due is safe early. A claim is stronger when it matches what you have already claimed. Don't bluff a Mask whose copies are all in the Gallery.
- **Advanced:** Impose Tribute is commonly considered the strongest early claim, since it can't be Interceded. A proven claim swaps your Mask, so a failed Unmask! hands the other guest a fresh card. Watch who is close to 7 Ducats.

**Rules that surprised us:** none recorded yet. `[PLAYTEST]` to fill.

**Candidate in-game hints (not built):** a count of how many of each Mask are still unseen, and a recap of the claims made. Both use only public information, so neither leaks hidden information.

**For the Practice tab:** teach that a proven claim swaps the Mask, since new guests often miss it.

---

## 24. Practice Tab (Tutorial)

**Chosen form:** ☒ Scripted hand

**Why this form:** a single guided round with a fixed deal and fixed draws, so the guest sees every Mask and almost every action in one sitting. It is also the default form, and the one The Bluff uses.

**The key actions the tutorial teaches** (matching §18): Take Your Due, Enforce Obligation, Impose Tribute, Unmask!, Intercede, Assume a Guise, Scandalise (from the receiving end) and The Cut Direct.

**The script.** Three guests: **You**, **Lady Vesper** and **Count Orsini**, acting in that order. Fixed deal:
- You: The Patron, The Maskwright.
- Vesper: The Confidence Man, The Dowager.
- Orsini: The Siren, The Dowager.
- Atelier (9): Patron 2, Siren 2, Confidence Man 2, Maskwright 2, Dowager 1.
- Everyone starts with 2 Ducats.

| Step | Guest | What happens | Ducats (You / Vesper / Orsini) | What it teaches |
|---|---|---|---|---|
| 1 | You | **Take Your Due**. | 3 / 2 / 2 | A plain action; nothing to challenge. |
| 2 | Vesper | **Enforce Obligation** (+2). You **Intercede**, claiming The Patron (you hold it). Nobody Unmasks. Vesper gets nothing. | 3 / 2 / 2 | Intercede, and why you hold a Mask. |
| 3 | Orsini | **Take Your Due**. | 3 / 2 / 3 | |
| 4 | You | **Impose Tribute** (claims The Patron, true). Vesper calls **Unmask!** You show it: the mask holds. Vesper surrenders her Dowager. Your Patron is shuffled in and you draw a Siren. The Tribute goes through. | 6 / 2 / 3 | A claim, being challenged, and the swap. |
| 5 | Vesper | **Cozen** You (claims The Confidence Man, true). You **Intercede**, claiming The Maskwright. Stands. | 6 / 2 / 3 | Cozen, and a second Intercede. |
| 6 | Orsini | **Impose Tribute** (claims The Patron, a bluff). The coach says "He doesn't hold it. Call Unmask!" You do. The mask slips: Orsini surrenders his Dowager. | 6 / 2 / 3 | **Unmask!** catching a bluff. |
| 7 | You | **Assume a Guise** (The Maskwright, true). You draw Dowager and Confidence Man, keep Siren and Dowager, and return Maskwright and Confidence Man. | 6 / 2 / 3 | Exchange. |
| 8 | Vesper | **Take Your Due**. | 6 / 3 / 3 | |
| 9 | Orsini | **Scandalise** You (claims The Siren, true), paying 3. You **Intercede**, claiming The Dowager. Stopped; his 3 Ducats are gone. | 6 / 3 / 0 | Scandalise, and the Dowager's block. |
| 10 | You | **Take Your Due**. The coach says "7 Ducats unlocks The Cut Direct." | 7 / 3 / 0 | The 7-Ducat threshold. |
| 11 | Vesper | **Take Your Due**. | 7 / 4 / 0 | |
| 12 | Orsini | **Take Your Due**. | 7 / 4 / 1 | |
| 13 | You | **The Cut Direct** on Orsini (pay 7). He surrenders his last Mask (Siren) and is **Ruined**. His 1 Ducat returns to the Coffers. | 0 / 4 / — | The unstoppable strike, and Ruin. |

**Checks.** Masks at the end: You hold Siren and Dowager, Vesper holds Confidence Man, Orsini holds none. The Gallery holds Dowager, Dowager and Siren (3), and the Atelier holds 9: 3 + 3 + 9 = 15. Per role: Patron 3 in the Atelier; Siren 1 (You) + 1 (Gallery) + 1 (Atelier); Confidence Man 1 (Vesper) + 2 (Atelier); Maskwright 3 in the Atelier; Dowager 1 (You) + 2 (Gallery). All five have 3 copies.

**Hidden information:** the opponents' hands are scripted, not real, so the coach may name them ("He doesn't hold it") without exposing anything.

**Sylly Mode coverage:** not covered in v1.

**Length target and exit:** about 5 minutes, with the guest able to leave at any point.

**What it deliberately doesn't teach:** acting a Scandalise or a Cozen yourself, the forced Cut Direct at 10 Ducats, and double loss. The Rule Reference (§15) covers those.

---

## Open Questions & Locks

### Open Questions
**No blockers.** Twelve non-blockers:
1. `[NON-BLOCKER]` **Dark stage.** Does the suite allow a dark stage? The deep plum is very dark, so on a dark stage buttons need a light edge (my pick), or the stage goes lighter.
2. `[NON-BLOCKER]` **Confidence Man's subtitle.** The Gilded Tongue and the Siren's The Velvet Voice are now both about speech. Keep both, or swap to The Fair Dealer or The Easy Smile?
3. `[NON-BLOCKER]` **PTP response window.** How should the shared phone collect Unmask! and Intercede calls?
4. `[NON-BLOCKER]` Verify the `[ORIGINAL]` rules: the Scandalise refund, 2-guest starting Ducats, and the Atelier size for 7–8.
5. `[NON-BLOCKER]` Court Tempo defaults and timer lengths.
6. `[NON-BLOCKER]` Favour 3/1/0 and the tiebreak Masque.
7. `[NON-BLOCKER]` Does the suite theme the lobby, room code and host? The Antechamber, Passphrase and Convener may be dropped.
8. `[NON-BLOCKER]` Confirm The Midnight Hour as the Sylly Mode (Secret Society is parked).
9. `[NON-BLOCKER]` Should bots ship in v1, or after the first alpha?
10. `[NON-BLOCKER]` The Play button label: Enter the Court or Take Your Mask?
11. `[NON-BLOCKER]` "Ducats" and "Favour" overlap with *Masques* (Fantasy Flight Games), which uses both. Are you comfortable with that?
12. `[NON-BLOCKER]` Confirm the remaining soft vocabulary in §9.

### Locked
The concept; title The Masked Court; abbreviation `mask`; emoji 🎭; brand colour deep plum `#4A2352`; The Ascendancy / A Masque / Your Gambit; Ducats; Favour; the Sovereign titles; The Atelier; the five roles and subtitles; the action names; Unmask! and Intercede; Unmasked and Ruined; the agreed flavour lines.

### Soft-locked
The rest of the vocabulary; Favour 3/1/0; player range 2–8; the settings; The Midnight Hour; the scripted Practice round; the role colours; the bot levels.

### Open for build
The response window in PTP; simultaneous Unmask! ordering; the rejoin window; bot takeover of a vacated seat; Court Tempo timers; the button edge on the dark stage.

### To watch in playtests
Pace of the response window; whether 7–8 guests drags; how often bluffs are called; whether Favour 3/1/0 rewards the right play; whether Grandee is too strong.

### Noted for later
Secret Society; The Phantom; The Plague Doctor; a Jester variant; teams; a TV view; a "Masks per guest" setting; an escalating Chime; alternate skins.

---

## Appendix: Notes for Stage 2

- Write the rules as pure, deterministic functions so a bot and the balance lab can run them without a screen.
- Use seeded shuffles for the Atelier so games can be replayed from the alpha game log.
- In MDLM the host's device runs the room. Hidden information (Masks, drawn cards, the Chime's swaps) must be sent only to the one device that owns it, never broadcast.
- Collect all responses to a declared action together, apply the first-received Unmask! (ties broken by seat order after the actor), and keep the window's timer on the host.
- The Chime is an event between Gambits. It must be skipped when the Masque is already decided.
- The Practice round is a fixed script: fixed deal, fixed draws, and a coach layer that can name scripted hands.
- The default art ships with every install, so keep it lean. A richer alternative skin can ship as optional.
- Alpha-only tools: forced-deal, game log, and a fast bot-vs-bot balance lab.
