# New Game Brief — Flawless
**Document type:** Phase 1 — Design Brief (non-technical)
**Who fills this in:** Project owner + AI, before any technical work
**What happens next:** Hand to Claude Code alongside `new-game-technical-template.md`. Claude Code reads this brief, reads the rule files, fills in the technical template, and presents it for confirmation before writing a single line of game code.

---

> **Status:** A faithful adaptation of **Love Letter** (the 21-card "Chancellor" edition) re-skinned to recognisable real-world gemstones — *The Master Jeweller's Exhibition*. Because it's a clone of a finished, elegant game, the **core loop, card roster, and win condition are fully resolved**. The design work is the re-skin, the suite-fit (mobile / multiplayer / thematic vocab / Sylly Mode), and a handful of edge-case confirmations. **No design BLOCKERs.**
>
> **This document has been reconciled (June 2026 review):** all legacy "Carats / `crt`" naming, the 2–6 player range, and the fixed-token dial have been folded into the body as the single source of truth. The old Decisions Log + Proposals are preserved at the bottom as a resolution record only — the body above is now authoritative.

---

## 1. Identity (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Full game name** | **Flawless** |
| **Short nickname / abbreviation** | `flw` (grep-unique against all 15 existing prefixes; deliberately not `gem`/`crt`) |
| **One-sentence tagline** | "The flawless one wins. Don't get exposed." |
| **Thematic universe** | **The Master Jeweller's Exhibition.** You're a master lapidary showing your finest stone in a velvet display case. The numbers are carat weight / rarity — a Pink Diamond outshines a Clear Quartz, and everyone knows it on sight. Read your rivals, expose their lesser stones, protect your own until the vault locks. *(Carat-weight detail is pure flavour / UX copy; the mechanics are a clean digital Love Letter engine.)* |
| **Emoji / icon** | 💎 |
| **Brand colour** | **Pink Diamond rose `#D6336C` + gold accents `#C9A227`** — a custom palette (like GTH sage, DYB ocean, FRT banana). Deliberately **deeper and more saturated than LI5's pink-500 `#ec4899`** so the two never read alike, and chosen over emerald because **Net-Trace already owns `emerald-600`**. Needs custom CSS: `pill-active-flw`, `game-toggle-on-flw`, `flw-range`, `flw-cta`, `flw-label`. |

**Source & adaptation note:** This is *Love Letter* — hold one card, draw one, play one, pass. The thematic driver: instead of delivering a letter up a social hierarchy, you're trying to have the **single most flawless, highest-carat stone on display when the vault door locks** (the deck runs out), while using lesser stones to disrupt rivals' appraisals. The artwork of a massive Blue Sapphire vs a tiny Clear Quartz teaches the power dynamic instantly — zero jargon.

---

## 2. The Players (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Player count range** | **3–4 (strict, v1).** Locking out 5–6 keeps information from rotting before it returns to your turn and keeps the mobile board uncrowded. 2-player (the "three face-up" variant) is OUT for v1. |
| **Teams or individuals?** | Individuals — everyone for themselves. |
| **Are there different roles?** | No persistent / asymmetric roles. Everyone is a Jeweller with the same job. The only varying state is **in the Showing** vs **Exposed** (knocked out for the current Showing, returns next Showing). |
| **Is any information hidden from some players?** | Yes — heavily. Your single hand card (**Your Showpiece**) is secret. Some effects reveal hidden info privately (Amethyst peek → one player only) or to the table (Opal duel → outcome only). The **Locked Lot** (burned card) is hidden from everyone, which stops perfect card-counting. |
| **Minimum / sweet spot** | Min 3, sweet spot 4. |

### Roles (if applicable)
No hidden/asymmetric roles — this is a symmetric deduction game, not a social-deception game. "Exposed" is a temporary **per-Showing** state (contrast Counting Sheep's permanent Sleepwalkers): exposed players sit out the rest of the current Showing and return for the next one.

> **Accuracy note:** even at 3 players, a player *can* be Exposed before their first turn (a P1 Quartz/Opal can hit P3). That's inherent to Love Letter and fine — a Showing is ~5 minutes and you re-enter next Showing. The 3–4 lock *reduces* information rot; it does not promise nobody is ever knocked out early.

---

## 3. The Core Loop (REQUIRED)

**In one sentence — what does a player DO on their turn?**
Draw a second gem from the Vault so you're holding two, then choose one to place face-up and resolve its effect — keeping the other as your secret Showpiece.

**Central tension / fun moment** (the signature Love Letter dilemmas, gem-flavoured):
- You hold the **Pink Diamond (9)** — unbeatable in a duel, but a single **Yellow Topaz (5)** forces you to discard it and you're instantly out.
- You're forced to play the **Blood Ruby (8)** early (you also drew the Sapphire) — now the table assumes you're sitting on something huge, and the next **Clear Quartz** guess comes for you.
- You played an **Amethyst** last turn and *know* the player to your left holds the Diamond — Topaz it out now, or wait?

**Closest type:** Deduction / bluffing — micro-deduction + risk, 5-minute high-tension Showings.

**Walk through one complete Showing:**
1. Shuffle the Vault (21-gem deck). Remove the top gem face-down — the **Locked Lot** — so nobody can perfectly count what's left.
2. Deal one gem face-down to each player — their starting Showpiece.
3. On your turn: draw one gem (now holding two), play one face-up, resolve its effect. End your turn holding exactly one.
4. Effects let you peek, compare, force-discard, trade, or guess. Getting **Exposed** (correct Quartz guess, lost Opal duel, or forced to discard the Pink Diamond) knocks you out of this Showing.
5. Play passes clockwise, skipping Exposed players.
6. **The Showing ends one of two ways:**
   - **Last one standing** — everyone else Exposed → survivor wins the Showing.
   - **Vault Lock** — the Vault runs dry → all survivors reveal their Showpiece; **highest carat wins**.
7. The winner earns one **Cut Diamond 💎** (token). First to the target Cut-Diamond count wins the whole game (**Best in Show**).

**Simultaneous or sequential?** Fully sequential — one player at a time, no simultaneous input anywhere. (Cleanest possible multiplayer profile.)

**Phone movement:** Each player on their **own device** (MDLM-first). Hands stay secret for an entire Showing, so pass-the-phone is awkward — individual devices only for v1.

---

## 4. Winning (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **How a game ends** | When one player reaches the target Cut-Diamond count. |
| **Winner** | First to the target is **Best in Show 🏆** and wins the whole game. |
| **Ties** | Within a Showing, a **Vault Lock** tie (equal carat) is broken by the **higher sum of that player's own discarded/exposed gems** this Showing (classic Love Letter tie-break). The overall token race makes a final game tie effectively impossible. |
| **Length** | ~5 min per Showing; full game ~15–25 min depending on token target + player count. |

---

## 5. Scoring (REQUIRED)

Tokens are **Cut Diamonds 💎**. No subtraction — you earn one or you don't.

| What happened | Who gets it | How many | Notes |
|--------------|------------|----------|-------|
| Win a Showing by being **last one standing** | The survivor | +1 Cut Diamond | All others Exposed |
| Win a Showing by **Vault Lock** (highest carat at deck-out) | Highest-carat survivor | +1 Cut Diamond | Tie → higher sum of own discards |
| **Raw Obsidian (0) bonus** | A surviving Obsidian-player | +1 bonus Cut Diamond | **Classic Spy rule:** only if they played an Obsidian, survived to round-end, AND are the **sole** surviving player to have played one. Two surviving Obsidian-players cancel each other out. |

**Balance:** a 30-year-refined design — faithful reproduction, not redesign. The 6× Clear Quartz vs singleton high gems is the deduction backbone; the Topaz-forces-Diamond line is the high-skill kill; the Obsidian bonus rewards a gutsy low play.

**Outcomes where nobody scores?** None — every Showing produces exactly one Showing-winner. The Obsidian bonus is the only conditional extra.

---

## 6. Settings (REQUIRED)

| Setting (display) | What it changes | Options | Default |
|--------------|---------------------|---------|---------|
| **Appraiser's Ledger** *(accessibility dial — sits first)* | ON shows the auto-counted gem matrix of everything Exposed this Showing (cognitive offload). OFF hides the matrix — the discard pile is still viewable as a plain list, but you do the counting (purist mode). | ON / OFF | **ON** |
| **Diamonds to Win** | Game length, **auto-scaled by lobby count** to preserve pacing. | **Auto (3p → 7, 4p → 5)** / Custom (3 / 5 / 7) | **Auto** |
| **Appraisal Clock** *(optional turn timer)* | Per-turn countdown to keep things snappy. On expiry the engine **auto-plays the just-drawn gem against a random legal target** (fizzle-discard if no legal target). | OFF / 30s / 60s | **OFF** |
| **✨ Sylly Mode (Smoke & Mirrors)** | See §7. | OFF / ON | OFF |

- **Player count** comes from the lobby roster (3–4) — not in the settings overlay (suite pattern).
- Auto-scale dead branch: the classic 5–6p → 4 tier is unreachable because the lobby is capped at 4. Only **3 → 7** and **4 → 5** are live; "Custom" exposes a 3/5/7 dial for shorter/longer sessions.

---

## 7. Sylly Mode

| Field | Your answer |
|-------|-------------|
| **Thematic name** | **Smoke & Mirrors 🪞** |
| **What changes** | Instead of one Locked Lot, **three** gems are removed face-down at the start of each Showing — the table can no longer reliably deduce what's left, every Quartz guess / Opal duel becomes a riskier read, and Showings run shorter and swingier. |
| **New screens/phases?** | No — changes a single setup number (gems burned). |
| **Changes scoring?** | No. |
| **Changes win condition?** | No. |

*(Richer future idea, not v1: a **Counterfeit** gem worth 0 at Vault Lock that can be played as a bluffed copy of any effect. Revisit post-core.)*

---

## 8. Thematic Vocabulary (REQUIRED)

| Generic term | What Flawless calls it |
|---|---|
| Round (one hand) | **Showing** |
| Score / points (tokens) | **Cut Diamonds 💎** |
| Your hand card | **Your Showpiece** |
| The draw deck | **The Vault** |
| The burned/removed card | **The Locked Lot** |
| Knocked out | **Exposed** |
| Deck runs out → reveal highest | **Vault Lock** |
| Immunity (Imperial Jade) | **Under Glass** |
| Game over screen | **Best in Show 🏆** |
| Play again | **Another Showing?** |
| Quit | **Pack Up Your Case?** |
| Settings overlay title | **The Display Case 💎** ("Set the scene before the first Showing.") |

---

## 9. Word Bank & Content (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Uses `words.json`?** | No. |
| **Content needed** | A small **fixed deck definition**: 10 gem types, each with carat value (0–9), quantity, effect, and display info. 21 cards total. Closest analogue: FRT's `FRT_FRUITS` constant. → a **`FLW_DECK` code constant** in the plugin, not a `data/` file. |
| **New data file?** | No — a code constant suffices (deck is not host-editable in v1). |
| **Exclusions** | N/A — no words. |

**The deck — 10 gems (faithful 21-card "Chancellor" mapping):**

| Carat | Gem | Qty | Effect | Love Letter card |
|------|-----|-----|--------|------------------|
| **9** | **Pink Diamond** | 1 | No active effect — if ever **forced to discard it**, you're instantly **Exposed**. | Princess |
| **8** | **Blood Ruby** | 1 | No active effect — **must** be played if held alongside the Sapphire (7) or Topaz (5). | Countess |
| **7** | **Blue Sapphire** | 1 | **The Trade** — swap Showpieces with another player. | King |
| **6** | **Green Emerald** | 2 | **The Deep Vault** — draw 2, keep best of your 3, return the other 2 to the **bottom** of the Vault in order. | Chancellor |
| **5** | **Yellow Topaz** | 2 | **The Recut** — choose any player **including yourself**; they discard their Showpiece and draw fresh. | Prince |
| **4** | **Imperial Jade** | 2 | **Under Glass** — can't be targeted until your next turn. | Handmaid |
| **3** | **Black Opal** | 2 | **The Private Appraisal** — secretly compare with a chosen player; lower carat is **Exposed**. | Baron |
| **2** | **Purple Amethyst** | 2 | **The Loupe** — secretly look at another player's Showpiece. | Priest |
| **1** | **Clear Quartz** | 6 | **The Scratch Test** — name a player + guess their gem (not Quartz); if correct they're **Exposed**. | Guard |
| **0** | **Raw Obsidian** | 2 | Worthless at Vault Lock — +1 bonus token if played + sole surviving Obsidian-player. | Spy |

Total: 1+1+1+2+2+2+2+2+6+2 = **21** ✓ (verified against the 2019 Chancellor edition).

---

## 10. Multiplayer Classification (REQUIRED)

| Field | Your answer |
|-------|-------------|
| **Own device or shared?** | **Own device (MDLM)** — the only v1 mode. |
| **Private info?** | Heavy — every Showpiece is private; Amethyst delivers private info to one player. |
| **Simultaneous play?** | No — strictly one player at a time. |
| **Device locked while another active?** | Yes — only the active player's device can act; everyone else (incl. Exposed) is on a spectator/standby view. |
| **Anything that breaks with multiple devices?** | Nothing. Pass-the-phone is the awkward case; MDLM is the natural fit. |

### Security model — **DECIDED: full host-authoritative private model (Option A)**
*(June 2026 review resolution — see Reviewer Notes.)*

The suite-standard "broadcast-and-mask" model (NAT/SS/BLD/FRT broadcast all hands and each device renders only its own) is **wrong for a game that lives entirely on hidden information** — a packet inspector would already hold every Showpiece, making any "targeted" Amethyst write pure theatre. Flawless therefore introduces the suite's **first true private model**:

- The **host holds all hands**; each device receives **only its own** Showpiece via a private per-device write.
- **All comparisons resolve host-side** (Opal duel, Vault Lock reveal, Quartz correctness) — only **outcomes** broadcast to `/events`.
- The **Amethyst peek result** is written solely to the looking player's private node.
- New engine primitive: `mpSendPrivate(targetUid, envelope)` → writes to `rooms/{code}/private/{uid}`; each device subscribes to its own `private/{myUid}` queue. Reusable by any future hidden-info game.
- Layered on top: the **Peek Guard** (Proposal #13 — tap-and-hold to reveal, blur on release) handles the *shoulder-surf* threat. With Option A this is genuine defence-in-depth (network privacy + physical privacy), not theatre.

---

## 11. Screens — Plain English List (REQUIRED)

All built as **the Stack** (one centred `max-w-sm` column: Header → Stage → Controls). **No radial / absolute-positioned table layout** — see Reviewer Notes. With only 3–4 players a compact rival strip in the Stage stays uncluttered.

1. **Game menu** — hub: Play, Settings, How to Play, Back to the Box.
2. **Lobby** — shared MDLM mode/lobby screens; names from roster (3–4).
3. **The Exhibition (main table)** — Stage holds a compact **rival strip** (avatars + status badges: 🛡️ Under Glass / greyed Exposed), the **Vault count + Appraiser's Ledger**, and the **public action log** drawer; Controls hold **Your Showpiece + the drawn-card slot + action button**. Sub-states: *your turn (choose which of two gems)*, *waiting*, *Exposed/spectating*.
4. **Targeting overlay** — choose which player an effect hits (Sapphire/Topaz/Opal/Amethyst/Quartz). Decision modal.
5. **Scratch-Test overlay (Quartz)** — pick a target **and** name a gem (Quartz omitted; immune/Exposed targets filtered out). Decision modal.
6. **Loupe result (Amethyst)** — **private** reveal (tap-and-hold Peek Guard), shown only to the looker.
7. **Private Appraisal result (Opal)** — reveal outcome (loser Exposed); exact carats stay secret.
8. **Showing result** — who won the Cut Diamond (last-standing or Vault Lock reveal).
9. **Best in Show (game over)** — first to target, final standings, Another Showing? / exit.
10. **Gem roster help drawer** — concise bracketed-terminology reference (see Proposal #7). **Data slide-up** (10 entries won't fit a modal), shared by the inline `[?]` and the How-to "The Gems" section.

*Standard overlays:* settings (The Display Case 💎), how-to, quit (Pack Up Your Case?), play-again (Another Showing?).

---

## 12. Open Questions & Design Notes — all resolved

Every edge case below is **decided**; Claude Code carries these into the tech spec.

- **Diamonds to Win** → Auto-scale (3p→7, 4p→5) + Custom dial. *(Decision #2)*
- **2-player** → OUT for v1; min 3. *(Decision #3)*
- **Abbreviation** → `flw`. *(Decision #1)*
- **Blood Ruby forced play** → **hard UI lock** — the other card is dimmed/unselectable, leaving only the Ruby; the app does not auto-play it for you. Applies regardless of which card was drawn vs held. *(Decision #4)*
- **Green Emerald** → returned gems pushed to the **bottom** of the Vault array, selection order preserved, no reshuffle. *(Decision #4)*
- **Yellow Topaz** → self-target permitted; if the Vault is empty the forced-discard target draws the **Locked Lot**. *(Decision #4)*
- **Pink Diamond + Topaz on empty Vault** → the discard penalty resolves **immediately** (instant Exposure) before any draw — so a Diamond-holder forced to discard is eliminated on the spot, draw never happens. *(Edge case, confirmed.)*
- **Clear Quartz** → guess UI omits Quartz and filters out immune/Exposed targets. *(Decision #4)*
- **Fizzle gate** → if no legal target exists, the action button becomes **"Discard (no effect)"**; per-card: **Sapphire / Opal / Amethyst / Quartz can fizzle** (need another player); **Topaz never fizzles** (self-target always legal); Jade/Ruby/Diamond/Obsidian are never targeted plays. *(Proposal #12)*
- **Amethyst privacy** → targeted private write to the looker only + Peek Guard. *(Decision #5)*
- **Appraiser's Ledger scope** → lists only publicly Exposed/discarded gems, never hidden Showpieces. OFF hides the auto-tally matrix but keeps the raw discard list. *(Proposal #11)*
- **Raw Obsidian bonus** → played + survived + sole surviving Obsidian-player. *(Decision #6)*

**Out of scope for v1:** 2-player "three face-up" variant; pass-the-phone mode; the Counterfeit-gem richer Sylly.

**Guiding rule:** faithful clone — resist "improving" the card effects. The 21-card balance is the appeal; all latitude is in the re-skin.

---

## 13. Mood & References

| Field | Your answer |
|-------|-------------|
| **Similar to** | Love Letter (direct 21-card re-skin). Adjacent: Coup, quick micro-deduction fillers. |
| **Tone** | Luxe, tense, quick. Velvet-and-gold elegance over a sharp, bluff-heavy knife fight. Five-minute high-stakes rounds. |
| **Should NOT feel like** | A heavy strategy game or a rules-lookup slog. "Look at the gem, instantly understand the power." |
| **Copy already written** | "The flawless one wins. Don't get exposed." · gem names + effect names (The Trade, The Deep Vault, The Recut, Under Glass, The Private Appraisal, The Loupe, The Scratch Test). |

---

## 14. Sample Round (REQUIRED)

**Setup:** 3 players — **Ada, Boris, Chloe.** Appraiser's Ledger ON, Auto tokens (3p → 7), Smoke & Mirrors OFF. One Locked Lot removed face-down. Each dealt one secret Showpiece. Order Ada → Boris → Chloe.

*Secret starts (invisible to others):* **Ada** Clear Quartz (1) · **Boris** Yellow Topaz (5) · **Chloe** Pink Diamond (9).

1. **Ada** draws **Purple Amethyst (2)** (holds Quartz + Amethyst). Plays **Amethyst (The Loupe)** on Chloe. Her device privately shows (tap-and-hold) Chloe holds the **Pink Diamond (9)**. Nobody else sees it. Keeps her Quartz.
2. **Boris** draws **Imperial Jade (4)** (holds Topaz + Jade). No strong read; plays **Jade (Under Glass)** — untargetable until his next turn. Keeps his Topaz.
3. **Chloe** draws **Black Opal (3)** (holds Diamond + Opal). Can't risk discarding the Diamond, so plays **Opal**. Boris is Under Glass → she must target **Ada**. Secret compare: Ada's Quartz (1) vs Chloe's Diamond (9) → **Ada Exposed.** Keeps her Diamond.
4. **Boris** (Under Glass lapsed) draws **Clear Quartz (1)** (holds Topaz + Quartz). Chloe's clearly protecting something big. Plays **Topaz (The Recut)** on **Chloe**: she must discard + draw fresh. Forced to discard the **Pink Diamond** → **instantly Exposed!**

**Result:** Only **Boris** survives → wins the Showing, **1st Cut Diamond 💎.** The Topaz-forces-Diamond line closed it. (Target is 7; Boris needs 6 more. New Showing begins.)

---

## Reviewer Notes (June 2026 — resolutions folded into the body above)

These capture the review decisions now treated as source of truth:

1. **Brand colour → Pink Diamond rose `#D6336C` + gold `#C9A227` (custom).** Emerald was dropped (Net-Trace owns `emerald-600`); rose is deeper/more saturated than LI5 pink-500 so they don't read alike.
2. **Security → Option A (full host-private model)**, not the half-measure. New `mpSendPrivate` primitive + `rooms/{code}/private/{uid}` queue; all hands host-held; only outcomes broadcast; Amethyst written to looker only; Peek Guard for shoulder-surf. *This is net-new engine-multiplayer infrastructure and is the single largest build item — confirm at the Stage 2 gate.*
3. **Layout → the Stack for every screen**, not the radial table. 3–4 players fit a compact rival strip in the Stage zone.
4. **Turn-timer expiry** → auto-play the just-drawn gem at a random legal target (fizzle if none).
5. **Token auto-scale** → live tiers 3→7, 4→5 (+ Custom 3/5/7); 5–6 tier unreachable under the 4-player cap.
6. **Ledger OFF** → hides the auto-tally matrix, keeps the raw discard list.
7. **Help drawer** → data slide-up (Pattern 1), shared by inline `[?]` and How-to.
8. **Card rendering** → single `flwRenderCard(gemId, opts)` seam (FRT model) for the future asset pack; CSS "luxury token" look (velvet-rose bg, gold gradient frame, vector cut, shimmer-on-select) — no raster art in v1.
9. **Emoji** → game 💎, token 💎, Best in Show 🏆.

---

## Original Decisions Log & Proposals (preserved as resolution record)

*(All folded into the body above. Kept for traceability.)*

- **[Decided] #1** — Rename Carats→**Flawless**, `crt`→`flw`; gem/carat detail is flavour only.
- **[Decided] #2** — Diamonds to Win auto-scales by lobby (3p→7, 4p→5, 5–6p→4) + Custom override.
- **[Decided] #3** — Player count strictly **3–4** for v1.
- **[Decided] #4** — Native rule enforcement: Blood Ruby hard lock; Emerald bottom-order; Topaz self-target + empty-Vault→Locked-Lot; Quartz guess constraints.
- **[Decided] #5** — Amethyst peek = targeted private write only.
- **[Decided] #6** — Raw Obsidian bonus = classic (sole survivor who played one).
- **[Proposed → adopted] #7** — Concise bracketed gem roster in How-to + inline `[?]` drawer (data slide-up; shared element).
- **[Proposed → adopted] #8** — CSS "luxury token" cards via `flwRenderCard` seam; no raster art v1.
- **[Proposed → revised] #9** — Compact play area. *Radial table replaced by the Stack (compact rival strip) per suite layout rules.*
- **[Proposed → adopted] #10** — Chronological public action log + private overlay split (public outcome vs private peek text).
- **[Proposed → adopted] #11** — Appraiser's Ledger as a pip-matrix grid (X played / total per gem).
- **[Proposed → adopted] #12** — Three-step Select → Evaluate → Target flow with a Fizzle gate.
- **[Proposed → adopted] #13** — Peek Guard: tap-and-hold to reveal, blur on release (touch-action / user-select / contextmenu guards required).
