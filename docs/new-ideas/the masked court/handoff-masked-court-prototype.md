# Handoff — The Masked Court: standalone HTML prototype

**For:** a fresh chat session. **Date:** 16 October 2026.
**Attach alongside this file:** `new-game-brief-masked-court.md` (reference only; everything needed to build is in this handoff).

---

## 1. What to build

A **single-file, standalone HTML prototype** of *The Masked Court*, a Coup-style bluffing and elimination card game, so the rules and the bots can be tested.

- One `.html` file. Vanilla JavaScript and CSS. No libraries, no CDNs, no build step, works offline.
- **Not** part of the Little Sylly Games app: no lobby, no room codes, no Firebase, no pass-the-phone, no saved data of any kind (no localStorage).
- Mobile-first, single column, usable on a phone.
- One human plus bots, in a **single Masque** (one game, last guest holding a Mask wins).
- Purpose: find out whether the rules feel right and whether the bots behave sensibly. Polish is not the goal.

**Out of scope for this prototype:** Sylly Mode (The Midnight Hour), Favour scoring and series, settings overlay, sound, illustrated art, 7–8 players, timers, MDLM and PTP, the Practice tab, How to Play. Use text and emoji placeholders for art.

---

## 2. Rules to implement (authoritative)

### Setup
- 2–6 guests: the human (seat 1) plus 1–5 bots. Default: human + 3 bots.
- **15 Masks:** 3 copies each of The Patron, The Siren, The Confidence Man, The Maskwright, The Dowager. This shuffled stack is **The Atelier**.
- Each guest gets 2 Masks (face down) and 2 Ducats. The rest stays in the Atelier.
- In a 2-guest game the first guest starts with 1 Ducat. *(From memory of the original; keep as a constant so it is easy to change.)*
- First guest random; play goes clockwise.
- Surrendered Masks go face up into **The Gallery**, visible to everyone.

### A guest's turn (Your Gambit)
Choose one action. A guest with **10 or more Ducats** at the start of their Gambit must make **The Cut Direct** (the only action offered).

| Action | Claims | Cost | Effect | Can be Unmasked? | Can be Interceded? |
|---|---|---|---|---|---|
| **Take Your Due** | none | — | +1 Ducat | no | no |
| **Enforce Obligation** | none | — | +2 Ducats | no | yes: any guest, claiming The Patron |
| **The Cut Direct** | none | 7 Ducats | target surrenders a Mask (their choice) | no | no |
| **Impose Tribute** | The Patron | — | +3 Ducats | yes | no |
| **Scandalise** | The Siren | 3 Ducats | target surrenders a Mask (their choice) | yes | yes: target only, claiming The Dowager |
| **Cozen** | The Confidence Man | — | take 2 Ducats from target (1 if they hold 1) | yes | yes: target only, claiming The Confidence Man or The Maskwright |
| **Assume a Guise** | The Maskwright | — | draw 2 from the Atelier, keep as many Masks as you hold, return the rest and shuffle | yes | no |

- A guest may claim a Mask they do not hold (a bluff).
- Cozen can't target a guest with 0 Ducats.
- A guest can only choose an action they can afford.

### Resolution order
1. The action is declared (with target, and claim if it needs one).
2. **Unmask window** on the claim. Every other live guest, in seat order after the actor, may call **Unmask!** or **Let It Stand**. The first Unmask! wins and the rest are cancelled.
3. If someone Unmasked:
   - **The mask holds** (the claimant holds the claimed Mask): the challenger surrenders a Mask (their choice). The shown Mask is shuffled into the Atelier and the claimant draws a replacement. The action carries on.
   - **The mask slips** (they don't hold it): the claimant surrenders a Mask (their choice) and the action is cancelled. If the action was Scandalise, its 3 Ducats are returned.
4. **Intercede window** (if the action can be Interceded). Eligible guests, in seat order after the actor, may Intercede by claiming the stopping Mask (see the table). First to Intercede wins.
5. **Unmask window on the Intercede claim.** Every guest other than the interceder, including the actor, in seat order after the interceder, may Unmask! it, with the same two outcomes:
   - If it holds, the Intercede stands and the action is stopped. A Scandalise's 3 Ducats stay spent.
   - If it slips, the Intercede is cancelled, the interceder surrenders a Mask and the action goes ahead.
6. The effect happens (unless an Intercede stood).
7. **Ruin check:** a guest with no Masks is **Ruined**. Their Ducats return to the Coffers (bank) and they are skipped from then on.

### Edge rules
- **Double loss:** a challenger who loses (the mask holds) and is also the target of a Scandalise that then goes ahead surrenders a second Mask, and may be Ruined.
- A guest Ruined mid-resolution cancels any further effects aimed at them.
- A guest with one Mask still draws 2 on Assume a Guise but keeps only 1.
- A surrendered Mask is chosen by its owner (human picks; bots choose per their bot logic).
- Intercede cannot itself be Interceded.

### Ending
The Masque ends when exactly one guest holds a Mask. That guest is **Sovereign of the Masque**. Show the winner and the order guests were Ruined.

### Constants to expose at the top of the code
Starting Ducats (2); 2-guest first-guest Ducats (1); Scandalise cost (3); Cut Direct cost (7); forced Cut Direct threshold (10); copies per Mask (3); Scandalise-refund-on-slip (true).
*(The refund rule and the 2-guest Ducat rule are from memory of the original and unverified, so keep them as flags.)*

---

## 3. Vocabulary (use exactly)

| Thing | Word on screen |
|---|---|
| Game | The Masked Court |
| One game | A Masque |
| Your turn | Your Gambit |
| Coins | Ducats |
| The bank | The Coffers |
| Cards | Masks (a guest holds two) |
| Deck | The Atelier |
| Face-up pile | The Gallery |
| Lose a card | Unmasked / "surrender a Mask" |
| Eliminated | Ruined |
| Winner | Sovereign of the Masque |
| Challenge | Unmask! |
| Block | Intercede |
| Do nothing in a response | Let It Stand |
| Challenge results | "The mask holds" / "The mask slips" |

**Roles and subtitles:** The Patron (*The Silver Hand*) · The Siren (*The Velvet Voice*) · The Confidence Man (*The Gilded Tongue*) · The Maskwright (*The Faceless*) · The Dowager (*The Immaculate*).

**Placeholder symbols** (so Masks read at a glance without art): Patron 💍 · Siren 🌹 · Confidence Man 🎩 · Maskwright ⬜ (blank mask) · Dowager 🪭 (fall back to 🧣 if it doesn't render).

**Tone:** serious, sly, a secret gathering of the powerful. Optional flavour lines in the log, for example "I do not believe we have met." (The Cut Direct), "I buried better schemers than you." (The Dowager intercedes), "That face was never yours." (the mask slips).

**Do not use these retired terms:** The Masquerade, Masquerade Ball, Season, Gala, Seals, Pickpocket, Swindler, Mask Maker, Reforge, Take Due, Levy Tribute, Call in a Favour, Seek Patronage, Compromise, Cut In, Cloakroom, Escorted Out, Struck from the List, Jester, Duke, Assassin, Captain, Ambassador, Contessa, Coup.

---

## 4. Bots

Every bot may know **only**: its own Masks, the Gallery, every guest's Ducats and Mask count, and the public log (claims, Unmask! calls, outcomes, and which Mask a claimant showed when a claim held). It must never read another guest's hidden Masks or the Atelier's order. Bots must only ever make legal moves. Give each a court name (Lady Vesper, Count Orsini, The Marquise, and so on) and add a short pause (about 700 ms) between bot moves so play can be followed. Put every probability below in a constants block at the top of the code.

### Easy bot, "Debutante" (random moves)
Every decision is a uniform random choice among legal options.
- **Action:** a random legal action (respecting affordability, the forced Cut Direct and valid targets), whether or not it holds the claimed Mask.
- **Unmask!:** calls it with 15% probability, else Let It Stand.
- **Intercede:** if allowed, Interceders with 25% probability, claiming a random valid Mask (it may not hold it).
- **Surrender or keep:** random.

### Standard bot, "Courtier" (structured)
**Belief helper.** For a role R, unseen copies = total copies − copies in the Gallery − copies in my own hand. If unseen = 0, nobody else can hold R. Otherwise estimate the chance an opponent with m Masks holds at least one R as `1 − C(T−u, m) / C(T, m)`, where T is the number of Masks not visible to me (all other guests' Masks plus the Atelier) and u is the unseen copies of R.

**Choosing an action, in priority order:**
1. If Ducats ≥ 10: The Cut Direct (forced).
2. If Ducats ≥ 7: The Cut Direct. Prefer a guest with one Mask left (a finisher); otherwise the guest with the most Masks, then the most Ducats.
3. If I hold The Siren and Ducats ≥ 3: Scandalise. Prefer a one-Mask target, then the target with the lowest chance of holding The Dowager.
4. If I hold The Patron: Impose Tribute.
5. If I hold The Confidence Man: Cozen the richest guest (≥ 2 Ducats) with the lowest chance of holding The Confidence Man or The Maskwright.
6. If I hold The Maskwright and nothing above applies: Assume a Guise.
7. Otherwise, with 2 Masks, bluff Impose Tribute 35% of the time if at least one Patron is unseen; otherwise Take Your Due. Never bluff when holding one Mask.
8. Use Enforce Obligation instead of Take Your Due when the chance any opponent holds The Patron is under 40%.

**Responding to a claim (Unmask!):**
- Unmask! if unseen copies of the claimed Mask = 0 (certain bluff).
- Otherwise, if the chance the claimant holds it is under 20%, Unmask! with 60% probability.
- Never Unmask! when I hold one Mask unless it is a certain bluff.
- Otherwise Let It Stand.

**Intercede:**
- Always Intercede when I truly hold the stopping Mask (The Dowager vs Scandalise, The Confidence Man or The Maskwright vs Cozen, The Patron vs Enforce Obligation).
- Bluff an Intercede only when facing a Scandalise on my last Mask.

**Surrender and keep order** (keep the highest; surrender from the end): Siren, Patron, Dowager, Confidence Man, Maskwright. Use the same order when choosing which Masks to keep on Assume a Guise.

### Hard bot
Not now. Define it after testing.

---

## 5. Prototype screens (minimal)

1. **Start:** number of guests (2–6, default 4), bot level per bot (Easy or Standard, default Standard), Start.
2. **The Court** (main): every guest with Ducats, Mask count (face-down symbols) and a Ruined mark; **your two Masks face up** (the human may see its own); the **Gallery** as chips per role showing surrendered/total (for example "Dowager 2/3"); the Coffers; a scrolling **action log**.
3. **Your Gambit:** action buttons with costs; unaffordable ones disabled; only The Cut Direct offered at 10+ Ducats; a target picker where needed.
4. **Response prompt** (when a bot acts): **Unmask!** / **Intercede** (pick which Mask to claim) / **Let It Stand**, with a clear statement of what was claimed. Skip prompts that don't apply.
5. **Surrender a Mask** and **Assume a Guise** (keep N of M) pickers.
6. **The Reckoning:** the winner, the order of ruin, and a "Play again" button.

**Look:** dark theme. Stage `#14111C`, panel `#241C2E`, text ivory `#F3EBDD`, gold accent for Ducats `#C9A24B`. Buttons deep plum `#4A2352` with a 1 px lifted-plum edge `#7D4A8B` and white text. Role colours: Patron silver `#A9B2BE`, Siren crimson `#B3263E`, Confidence Man gilt `#C9A24B`, Maskwright verdigris `#2F7F86`, Dowager pearl `#EFE6D2`. Text at least 14 px. Always show a role's symbol and name together, never colour alone.

**Spelling:** Australian English (colour, favour, organise).

---

## 6. Test and dev tools (these matter more than polish)

- **Show all hands toggle** (debug) so you can see every guest's Masks.
- **Invariant checker** after every action: total Masks always 15 and 3 of each role; hands never exceed 2 Masks; no negative Ducats; Gallery + hands + Atelier = 15.
- **Bot-vs-bot simulator** (a hidden panel or a button): run N games (default 1,000) with chosen guest counts and bot mixes, then report win rate by seat and by bot type, average Gambits per Masque, how Masques tend to end (Cut Direct, Scandalise, or failed Unmask!), and any stalled or illegal game (flag anything over 300 Gambits).
- **Seeded shuffles** with a visible seed, so a surprising game can be replayed exactly.

---

## 7. Acceptance checklist

- [ ] All seven actions work, including the forced Cut Direct at 10+ Ducats.
- [ ] Unmask! works both ways (the mask holds and the mask slips), including the Mask swap on a proven claim.
- [ ] Intercede works for all four Mask claims, and an Intercede can be Unmasked.
- [ ] Double loss works, and Ruin and the Coffers behave.
- [ ] The game ends with exactly one guest holding a Mask.
- [ ] Easy and Standard bots only ever make legal moves and never read hidden Masks.
- [ ] 1,000 bot-only games run with no stalls, illegal moves or invariant failures.
- [ ] A human can play a full game on a phone-width screen.

---

## 8. Open items (not for this prototype to decide)

- Whether Scandalise's 3 Ducats are refunded when its claim is Unmasked and slips, and the 2-guest starting Ducats, are from memory of the original. Keep them as flags.
- Simultaneous Unmask! ordering: this prototype resolves it in seat order after the actor, first caller wins.
- Time limits, bots in a shared-phone mode, Favour scoring, the Sylly Mode and the Hard bot are all parked.

---

## 9. Paste-in prompt for the new chat

> I'm attaching `handoff-masked-court-prototype.md` and `new-game-brief-masked-court.md`. Please build the standalone single-file HTML prototype described in the handoff. The handoff is the source of truth for the rules, vocabulary and bots, and the brief is reference only. First, confirm the rules back to me in about five lines and tell me anything that looks ambiguous. Then build it in stages: the rules engine with the invariant checker first, then the Easy and Standard bots with the bot-vs-bot simulator, then the phone UI. Show me the simulator results before we start tuning the Standard bot.
