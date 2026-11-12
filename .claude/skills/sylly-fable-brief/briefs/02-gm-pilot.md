# Task 2 — GM pilot (UI revamp Stage 2)

**Mode:** Build · **Tier:** 2 · **Needs:** task 1's review done and its fixes applied or declined ·
**Sessions:** ~1 for R1 → R2c (it ends at the owner gates), then about one per 2–3 build stages
**Summary below written 12 Nov 2026 (SW v291).** Check it against the sources before relying on it.

## Why this

GM is the **second pilot**. What LI5 and GM both use becomes the shared scene kit, and the pass written
down after GM becomes `sylly-ui-pass`, the skill every batch game runs from. A sloppy GM pass carries
into 18 games. It is also the most taste-heavy job on the list (three directions for a world the owner
loves conceptually but hasn't seen built), which is where Fable earns its price.

## Where things stand

- **The game today:** gold-master, game 2, `activeGameId` `great-minds`, plugin `js/games/great-minds.js`
  (52 KB), markup `src/screens/gm.html` (38 KB). PTP + MDLM, **2 players**, lobby `individual` roster.
- **World concept picked 9 Nov** (programme spec § 17.3): each word is a **thought bubble**, your clue goes
  in the **overlap**, and a sync **merges** the bubbles. History becomes a **word cloud**: every earlier
  word, the current pair largest and loudest, older ones smaller and fainter. It is hard to mock
  statically, so prototype it. Drop the radio / frequency / station language. Keep mind / wavelength / sync
  / connection (Neural Link and Mind Meld are candidates to keep).
- **Brand:** purple stays, and a better shade may be chosen. The **violet-500 CTA / purple-\* pill split**
  (`gm.md` T7c) is resolved in the same move.
- **Boards from the programme brainstorm:** https://claude.ai/artifact/XbfGxB5hXCRPbJU7z4b9x6 and
  `wip/revamp/mockups/gm/`. These are concept boards. **R2b still owes the three action-screen
  directions** (375×667, on a Design canvas) built on the picked concept.
- **Tracker:** GM 0/16. Practice card: `docs/practice-rollout.md` § 6.18 (Autopilot ✔).
- **No GM harness exists.** If the pass touches packets, it earns a loopback (on `mp-world`, like
  `verify-li5-loopback.js`).

## Pain points (known)

1. **The radio vocabulary is everywhere**: the settings overlay is *Frequency Configuration* with a
   *Frequency Tuner* and *Adjust Frequency Range* (`gmFrequencyRange`); *Session Terminal*, *Signal
   Boost*, *Psychic Echoes*, *Sever Link*. Every rename is a paired copy change (`gm.md` T5 / T7b, checked
   by `verify-identity-docs.js`) and a JS-string sweep (lessons L3).
2. **The Line-up type is undecided.** With 2 players a team Line-up means nothing. The choice is a
   `'seats'` beat (it would be the first, and the programme needs it designed for JEC/YGI/LTTP/NAT) or
   `'none'` plus a roll call. Decide at R2, and say what it means for the four `individual` batch games.
3. **GM isn't in `MP_END_SCREENS`** (per-round result screens), so a phone locked at the podium reads as a
   drop (`docs/deferred-work.md` § Reconnect adoption).
4. **Stale Bug Index:** `gm-implementation-notes.md` lists G4/G5/G6 as open, but all three are fixed in
   code. Only G3 (unreproduced) is real. Close the three at R1.
5. **The word cloud is the hard part:** layout stability as it grows, legibility at 320 px, reduced
   motion, and 60 fps on the iPhone SE with an automatic static tier (`ui-revamp.md` § 4).

## Read first

1. `docs/rules/ui-revamp.md` whole, plus `docs/ui-revamp-lessons.md` whole (as amended by task 1).
2. `docs/ui-revamp-rollout.md`: § 2, the GM card, § 6.
3. Programme spec `docs/superpowers/specs/2026-11-08-ui-revamp-design.md`: §§ 11, 17.1, 17.3.
4. `docs/game-identities/gm.md`, whole (21 KB).
5. `docs/implementation-notes/gm-implementation-notes.md`: Template Gaps and the Bug Index (Grep).
6. `src/screens/gm.html`, whole. `js/games/great-minds.js`: Grep, then slices.
7. The structure template to copy: `docs/superpowers/specs/2026-11-09-li5-pilot-design.md` (headings,
   then the stage breakdown only).
8. At R10 only: `docs/practice-rollout.md` §§ 1, 3, 5 + § 6.18.
9. At R2b only: `DESIGN.md`, `PRODUCT.md`; the LI5 boards (https://claude.ai/artifact/8YuBcu4fLveMY4XtF9RbJz)
   as the quality bar; ETA's and HSG's picked boards (linked from their identity docs) as range.

## The result we want

- **R1 → R2c:** intake (`node tools/capture-screens.js gm before`), a world brief, and a GM pilot spec in
  `docs/superpowers/specs/` in the LI5 pilot's shape. **R2 owner gate:** narrator, mood words, Intro
  copy, the Line-up decision, terminology.
- **R2b owner gate:** three distinct directions on a Design canvas (Artifact `quickstart` with
  `intent: "design"`), every value inline, each one with the word cloud working in a prototype state.
  Distinct means a different idea, not three palettes. The owner picks or mixes.
- **R3 → R14** built in stages, each stage a commit + SW bump, as LI5 did. The radio language is gone from
  every string (grep `src/ js/ data/ tools/`), the violet/purple split is resolved, and GM is in
  `MP_END_SCREENS` if that's correct for its flow. There is a GM loopback with a mutation runner if
  packets changed.
- **R15 is the owner's:** write them a short phone checklist (`?fps` on the word cloud, a 2-phone MDLM
  session, PTP once) and mark the task ⏸ until it's played. **R16** closure follows the owner's session.
- Tracker card and row are kept current at every stage, and new lessons go to `ui-revamp-lessons.md`.

## Owner gates

R2 world brief · R2b direction · any brand-colour change · R15 phone session.

## Verification

GM loopback + mutants (new) · `verify-identity-docs` · `verify-mp-configs` · `verify-game-intro` (+ mutate)
if the `intro` config is added · `verify-build-fresh` · `verify-tv-labels` · `visual-check` at
320×452 / 375×548 / 375×667 + reduced motion, measured with the longest real strings (lessons L7).

## Progress log

*(append: date · what was done · commits · where it stopped · next concrete step)*
