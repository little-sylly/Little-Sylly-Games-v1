# Design — Per-game identity documents

**Date:** 22 August 2026
**Scope:** Documentation architecture — all 18 games
**Type:** New document type + incremental retirement of `docs/rules/game-identities.md`
**Replaces:** `docs/rules/game-identities.md` (225 KB, 18 sections), retired section by section

> **Status: COMPLETE — 23 August 2026.** All 18 passes shipped in the order set out in § 11;
> `docs/rules/game-identities.md` is deleted and every live reference to it re-pointed (§ 8.5).
> This document is now a **record of the design**, not live work — read it for the change contract
> (§ 5), the ten-section template (§ 5–6), and the conventions (§ 12) when writing or editing an
> identity doc. Closing snapshot: `docs/decision-log.md` 2026-08-23.

---

## 1. Problem

### 1.1 There is no non-technical record of what any game *is*

The workflow is **brief → tech spec → implementation plan → build**, and a great deal changes
during the build. The brief describes a game that was never shipped; the tech spec describes an
intended implementation, not the delivered one. After ship, the only complete and correct account
of a game is **the code**.

That blocks three things the owner needs:

1. **Non-technical review.** Reading themes, wording, terminology and settings as a body of work,
   making changes in the doc, then applying them to code. Impossible today — the review surface
   would be `index.html` plus a plugin file.
2. **Context handoff.** Briefing custom art, a copy pass, or a game review means handing over a
   225 KB file of which ~60% is packet names and z-indices, or handing over source.
3. **Reference.** Answering "what is Cookie Jar, in a sentence" requires a code read.

### 1.2 `game-identities.md` is the wrong document, not merely a large one

The instinct is to split it 18 ways. Measured, that is not enough. The file is **224,832 bytes /
~2,300 lines**, 18 sections averaging ~130 lines (LI5 66, FLW 231, NT 187). Roughly **40% is
identity and 60% is technical** — state-flow diagrams, packet names, overlay z-indices, screen IDs,
Firebase wire discipline, DD-XX rationale. CJAR's section spends more lines on the reveal
choreography's millisecond budget than on what the game *is*.

Splitting it produces 18 hybrid files: still unusable as an art brief, still not a clean copy
review, and the migration cost paid without the document being delivered.

### 1.3 The cost is already being paid, repeatedly

`docs/deferred-work.md:493` records the Round/Night Intro sweep being closed on 13 August 2026 by
an **ad-hoc code investigation across all 18 games** — implemented in PKO/NAT/PASS, "investigated
and correctly ruled out" in GTH and DYB. That exercise re-derived every game's phase structure from
source because it is written down nowhere. The same shape recurs: the settings dynamic-value-line
sweep, DD-31 button parity, the how-to gallery rollout — each a suite-wide code sweep answering a
question a per-game reference would have answered by being read.

### 1.4 As the library grows, one file gets worse on every axis

18 games today. A single file is expensive to read, invites unrelated tasks to touch it, and
provides no per-game snapshot. Once a game is polished and settled, its record should be **isolated
and stable** — not a section of a file that every other game's work opens.

---

## 2. Decision

**Decision.** Every game gets its own non-technical identity document at
`docs/game-identities/[abbr].md`. `docs/rules/game-identities.md` is retired **incrementally** —
one game's section deleted per migration pass, its technical content redistributed to the documents
that already own that class of fact. The file is deleted when its last section leaves.

**Rationale.** Identity and technical reference have different audiences, different lifecycles
(authored vs derived-from-code) and different read patterns. Separating them gives each a single
home. Retiring rather than shrinking `game-identities.md` avoids a permanent split-brain where two
documents both plausibly own a game's settings table.

**Technical Impact.** New directory `docs/game-identities/`. New harness
`tools/verify-identity-docs.js`. `CLAUDE.md`'s per-game pointer becomes conditional on a migration
tracker, and both its **Documentation Integrity Protocol** (step 2) and `docs/rules/phase-audit.md`
(five checklist items) are amended to point at identity docs — see §8. `docs/code-map.md`, per-game impl-notes, `docs/rules/per-game-classes.md` and the per-game
tech specs each gain the technical residue in their own idiom. No application code changes; no SW
version bump.

---

## 3. What this document is — and is not

**It is** the complete non-technical account of a shipped game: what it is, what it feels like, how
it is played, every word on screen, every setting, every named term, the shape of the session.
Written so a person who has never seen the code can review it, brief art against it, or learn the
game from it.

**It is not** a specification, a state machine, or a code map. It records **what shipped**, not what
was intended. Where the delivered game diverges from its tech spec, the identity document is right
and the spec is history.

**Hard exclusion list** — none of the following appears in an identity document:

| Excluded | Its home |
|---|---|
| Screen / overlay element IDs *as a reference table* | `docs/code-map.md` |
| Packet names, envelope shapes, handler lists | tech spec + `docs/code-map.md` |
| `rosterConfig`, host-as-participant, private-channel mechanics | tech spec |
| Internal state variable names, function names | `docs/code-map.md` |
| Tailwind / CSS class strings, z-indices | `docs/rules/per-game-classes.md` |
| DD-XX / BUG-XX rationale, "why we changed it" | per-game impl-notes |
| State-flow diagrams | tech spec |

One deliberate exception: **T7's flow table carries screen IDs in a column**, because a beat map
whose rows cannot be located in the code is not actionable. It is a locator, not a reference table —
the reference table stays in `code-map.md`.

---

## 4. Location and naming

```
docs/game-identities/
  cjar.md
  pko.md
  ...
```

Directory named `game-identities` to carry the existing vocabulary forward. Files named for the
`activeGameId` abbreviation alone — the directory already supplies "identity", so
`cjar-identity.md` would stutter. Note SS's file is **`ss.md`**, matching its plugin/impl-notes
abbreviation, not its legacy `activeGameId` of `sylly-signals`; the internal id is recorded in the
header block.

Target size **15–25 KB per game** — read whole, never sliced. A file materially over 25 KB is a
signal that technical content has leaked in.

---

## 5. The template — ten sections

Every file opens with a header block, then T1–T10 in this order. A section that genuinely does not
apply is kept with a one-line statement of why, never silently dropped — an absent section is
indistinguishable from an unfinished one.

```markdown
# [Display Name]

**Game N** · `activeGameId: [id]` · plugin `js/games/[abbr].js`
**Emoji:** [x]  ·  **Brand:** [colour + hex/utility]  ·  **Players:** [n–m]  ·  **Modes:** [...]
**Status:** gold master · verified against SW v[N] on [date]
```

### The change contract — which sections are safe to edit

§8.1 says an identity document is a proposal before a change and a record after it. This says
**which parts are which**. Every section heading carries its tier, so the rule is visible at the
point of editing, and the legend below is reproduced near the top of every identity document.

| Tier | Sections | Rule |
|------|----------|------|
| **free** | T1, T2, T3, T4, T8, plus T7c and T10's judgement line | Reword freely — no code reads them. **Must still be true.** A free edit can be a factual bug: the CJAR pitch shipped a draft saying players choose about the card they have just seen, contradicting the game's load-bearing ordering and its own T3. |
| **paired** | T5, T6's setting and option **labels**, T7b copy blocks | Doc and code change **together**. A doc-only edit creates a gap between what the document promises and what the app says. Tag an unbuilt change `◇ proposed` until the code ships. T7b is harness-guarded; **T5 is not, which makes it the most dangerous section in the document.** |
| **derived** | T6 defaults and option counts, T7a screens/types/durations, T9, T10's counts and modes | **Code first, doc follows.** Editing these changes nothing except whether the document is correct. |

**Tiers attach to the fact, not only to the section — which is why T6 and T7 are mixed.** In T6,
*"Safe First Grab"* is a **paired** label while *"the default is Safe First Grab"* is a **derived**
fact. In T7, the flow table is derived, the copy blocks are paired, and the closing judgement is
free.

**T5's collision rules are suite-wide, not per-game.** Constraints of the form *never write the
bare word "Stash"* exist because another game already owns the term. Changing one is not a decision
about this game — it touches every game in the collision. Mark them `suite-wide` so they are never
edited locally.

### T1 — The Pitch · *free*
One paragraph. Why you would pick this off the shelf, in the voice you would use to a friend.
**New authored content** — exists nowhere today.

### T2 — The Premise · *free*
Two to three paragraphs. The fantasy: what you *are* while playing, what the table feels like, what
the tension is. **New authored content.**

### T3 — How to Play · *free*
The rules in plain English, in the order you would explain them at a table. Setup → the loop → how
it ends → how you win. No screen names, no state flow. A reader must be able to learn the game from
this section alone.

### T4 — Theme & Flavour · *free*
The world, the voice, the register, what is on-theme and what is not. Where a content guide exists
(`docs/cjar-content-guide.md`, `gth-`, `ygi-`) this section **summarises and links** — it does not
duplicate it. This is the primary art-brief and copy payload.

### T5 — Terminology · *paired*
Every named thing in the game, with its meaning. Carries the **collision rules** verbatim where they
exist ("never write the bare word *Stash*"; *Crumb Trail* not *Cookie Trail*) — these are the
constraints most easily violated by a well-meaning copy edit.

### T6 — Settings · *mixed — labels paired, values derived*
Display name · options · default · **what it does in play**. No internal variable names, no internal
values. Sylly Mode is named here and detailed in T8. Records any **mutually-exclusive or superseded**
relationship in player-facing terms.

### T7 — The Player's Journey · *mixed — 7a derived, 7b paired, 7c free*

Two parts, one screen list.

**T7a — the flow table**, one row per screen, in play order:

| Col | Contents |
|---|---|
| `#` | Order |
| Screen | Element ID — locator only |
| Beat | What the moment *is*, in the game's voice ("Raid 2 of 5", "you got caught") |
| Type | `Menu` · `Setup` · `Gate` · `Interstitial` · `Interactive` · `Summary` · `Result` |
| Duration | For `Interstitial` only — the auto-advance window |
| Chrome | Which of `[?]` `🔊` `✕` are present |

Type vocabulary is `ui-style.md`'s existing language, not new terms. `Gate` is the Pass-the-Phone
Safety Gate; `Interstitial` is the rule-5 exemption (auto-advancing, nothing interactive). The
**Chrome** column makes `ui-style.md` rule 1 and rule 5 auditable from the document — an
`Interactive` row missing `[?]` is a finding without opening a file.

**T7b — the copy**, nested per screen in the same order: every visible string, including overlay
bodies and How-to step cards. Verbatim, in fenced blocks (see §10).

**T7c — "Where the journey is thin"**, closing the section: two or three plain sentences naming
gaps, dead moments and beats that could carry flavour but do not. **Marked as judgement** (§12).

### T8 — Sylly Mode · *free*
Its own section — every game has one and it is a distinct identity, often a substantially different
game (CJAR's Dibber Dobber, PKO's Force of Nature). Name, what changes, what it feels like, and any
settings it supersedes.

### T9 — Art & Assets · *derived*
What artwork exists, what is still emoji/CSS default, where it renders, and whether the game has a
How-to gallery tab. Dimensions and authoring process stay in `docs/art-authoring-guide.md` — this
section says *what exists*, that guide says *how to make it*.

### T10 — At the Table · *derived — except the PTP judgement*
Who is in the room and on what devices.

- **Modes** — supported and recommended, in player-facing words
- **Players** — range, and the count it is best at
- **Devices** — one per player, one per team, or one shared
- **Shape-changing settings** — any setting that alters player count or session structure
  (FRT's Pear-Off forces exactly 2; NT's DNP mode changes the captain structure)
- **How it plays at each size** — 3 players and 8 players are different games
- **Could it be Pass-the-Phone?** — yes/no and what stands in the way. **Marked as judgement** (§12).

Excludes all MP mechanics per §3's exclusion list.

---

## 6. The per-game identity pass

The unit of work. All four steps or none — a partial pass leaves the split-brain state this design
exists to prevent.

1. **Write** `docs/game-identities/[abbr].md` against the §5 template, sourced from the game's
   plugin file, its `index.html` block, its impl-notes, its tech spec, and its section of
   `game-identities.md`.
2. **Redistribute** that game's technical residue per the redistribution map in §7. Every line of the outgoing section
   is accounted for — moved, or consciously dropped as already-recorded-elsewhere. Anything with no
   home gets one named in the pass's notes.
3. **Delete** that game's `## Game N:` section from `docs/rules/game-identities.md`.
4. **Close** — tick the tracker, run `tools/verify-identity-docs.js`, update
   `docs/decision-log.md` on the first pass only.

Section numbering (`## Game 13:`) is dropped from remaining headings as sections leave, since the
numbers become misleading mid-migration. Game number lives in each identity file's header block.

---

## 7. Redistribution map

| Content in the outgoing section | Destination | Notes |
|---|---|---|
| Screens table (ID → purpose) | `docs/code-map.md` | Already the owner; verify then merge |
| Overlay types table (ID, pattern, z-index) | `docs/code-map.md` | Same |
| Brand colour / pill / toggle / range classes | `docs/rules/per-game-classes.md` | Already the owner — usually a no-op |
| State flow diagram | `docs/new-game-tech-[name].md` | Where a tech spec exists |
| DD-XX / BUG-XX rationale, "special mechanics" prose | `docs/implementation-notes/[abbr]-…md` | Usually already there; delete the duplicate |
| Multiplayer packet lists, handler notes | tech spec, or impl-notes § Multiplayer Lessons | |
| Key state variables | `docs/code-map.md` | |
| Terminology, settings, theme, flavour | **the new identity file** | |

**Most of the technical residue is already duplicated elsewhere.** The expected outcome of step 2 on
most games is *verify and delete*, not *move*. Where genuinely unique content is found, moving it is
the pass's real work — and finding it is why step 2 cannot be skipped.

---

## 8. Document relationships and the change lifecycle

Sections 3 and 7 say where each fact *lives*. This section says how a change *moves* — which
document is touched first, which follows, and which one is right when two disagree.

### 8.1 The identity document is a proposal before a change, a record after it

Two directions, both legitimate:

**Identity-first** — the review loop these documents exist to enable:

```
read the identity doc → mark the change in it → the mark becomes a work item
  → code changes → identity doc updated to match what shipped → harness green
```

The document is where a change is **raised**, never where it is **made**. A change written into the
document but not yet built is a proposal, and must be tagged `◇ proposed` (§12's judgement mark,
reused) or kept out until the work item exists. An untagged intention sitting in a reference
document is indistinguishable from a fact, and the next reader will brief art against it.

**Code-first** — an ordinary build, fix or polish pass:

```
code changes → Documentation Integrity Protocol → identity doc updated at closure
```

**The invariant, both directions: where the document and the code disagree, the code is right and
the document has a bug.** These files record what shipped. The harness enforces that mechanically
for T7b; T3, T5, T6 and T10 rely on the verified-against stamp (§12) and the phase-audit checks
(§8.4).

This is not hypothetical. `docs/superpowers/plans/2026-08-14-flw-gem-seam.md` records
`game-identities.md` § Game 16 as **"currently documents a different game"** — a pass-and-declare
bluffing loop, ten unrelated gem names, four settings that do not exist — and schedules a full
rewrite against shipped code. An entire game's section drifted into fiction, undetected, because
nothing checked it.

### 8.2 The Documentation Integrity Protocol changes

`CLAUDE.md`'s six-step protocol names `game-identities.md` at **step 2**. That file is being
deleted, and step 2's *content* also splits — half of what it asks for belongs at step 1:

| Step | Today | After |
|---|---|---|
| 1 | `code-map.md` — screen IDs, overlay IDs, key functions, state variables | Unchanged, and now the **sole** home of overlay/screen reference tables |
| 2 | `game-identities.md` — settings, terminology, overlay types, screen entries | **the game's identity doc** — T5 terminology, T6 settings, T7 journey + copy, T8 Sylly Mode, T9 art. Overlay and screen *reference tables* are step 1's job, not this one |

Steps 3–6 unchanged.

Amended **once, in pass #1**, to a conditional form correct for the whole migration: *"the game's
identity doc, or its `game-identities.md` section if not yet migrated"*. The tracker column (§9)
resolves which. The fallback clause is deleted in the final pass.

### 8.3 Art

Custom art has three documents and they do not overlap:

| Document | Owns |
|---|---|
| `docs/art-authoring-guide.md` | **How** — dimensions, aspect, the render seams, conversion tooling, the offline install check |
| `docs/expansion-guide.md` § Core art packs | **Rollout status** — which games are converted, the 4-step conversion, precache requirements |
| The identity doc, **T4 + T9** | **What and why** — T4 is the brief (world, voice, register, what is on-theme); T9 is the record (what exists, what is still emoji/CSS, where it renders) |

So the identity doc sits at **both ends** of an art job:

```
T4 + T9 brief the work → art authored per art-authoring-guide → sw.js precache + CACHE_NAME bump
  → T9 updated (what now exists) + expansion-guide rollout tracker updated
```

Dimensions, file sizes and per-file ceilings stay **out** of T9 — they belong to the authoring
guide, and duplicating a number is how two numbers end up disagreeing. T9 says *this game has 14
card faces and a back, rendered on the table and in the How-to gallery*; the guide says how big they
may be.

### 8.4 `phase-audit.md` — manual checks become mechanical

Protocols A and B carry five checklist items that read `game-identities.md` by hand:

| phase-audit check | After migration |
|---|---|
| Screen IDs match the State Flow | T7a flow table — and a candidate for the harness |
| Settings table matches the plugin's setting variables | T6 |
| Scoring values match the resolve function | T3 / T6 |
| Terminology coverage in user-facing strings | T5 + T7b — **harness-covered** |
| Quit overlay copy is thematic (heading, subtext, confirm, cancel) | T7b — **harness-covered** |

Two of the five stop being manual. The other three keep a human in the loop but read a 15–25 KB file
instead of grepping a 225 KB one. Protocol A's existing line — *"code-map is the actual source of
truth \[for state variables]; don't add a 17th redundant table"* — already agrees with §3's
exclusion list and needs no change.

Amended in the same pass as the Integrity Protocol, in the same conditional form.

### 8.5 The dependency surface

**Eight live documents** reference `game-identities.md`, two of them always-loaded baseline files:

| Document | Refs | Amended |
|---|---|---|
| `CLAUDE.md` | 9 | Pass #1 (tracker, pointer, Integrity Protocol); final pass (the rest) |
| `.claude/rules/definitions.md` | 1 | Final pass — **always-loaded** |
| `.claude/rules/ui-style.md` | 1 | Final pass — **always-loaded** |
| `docs/rules/phase-audit.md` | 5 | Pass #1 (§8.4) |
| `docs/rules/new-game-checklist.md` | 1 | Final pass |
| `docs/rules/new-game-process.md` | 1 | Final pass |
| `docs/rules/new-game-technical-template.md` | 1 | Final pass |
| `docs/templates/testing-session-protocol.md` | 1 | Final pass |
| `docs/token-budget-register.md` / `-handoff.md` | 5 | Final pass — bookkeeping; the ~34.7k figure they cite dies with the file |

**Historical specs and plans are never rewritten.** Ten-plus files under
`docs/superpowers/{specs,plans}/` instruct a reader to update `game-identities.md` § Game N. Those
are accurate records of work done at the time; editing them would falsify the archive to tidy a
reference. They are left exactly as they are.

---

## 9. Transitional routing

The migration runs sequentially over many sessions. Routing must be unambiguous at every point.

`CLAUDE.md`'s § Per-Game Quick Index gains one **`Identity doc`** column — ✅ or —. The on-demand
pointer for `game-identities.md` becomes:

```
Migrated (✅)  → read docs/game-identities/[abbr].md whole (~15–25 KB)
Not yet  (—)  → Grep "## Game N:" in docs/rules/game-identities.md, offset-Read that section
```

No new file, no second tracker. When every row reads ✅, `game-identities.md` is gone and the
pointer plus the column are deleted in the final pass.

---

## 10. The harness — `tools/verify-identity-docs.js`

**Problem it solves.** T7b quotes UI copy verbatim. Copy mirrored into a document drifts the moment
a label is edited, and a confidently-wrong doc handed to an art contractor is worse than no doc. The
review loop the owner wants — *change the doc, then change the code* — only closes if drift is
caught mechanically.

**Contract.** For every file in `docs/game-identities/`, extract every string inside a fenced block
tagged `copy` and assert it appears in `index.html` or `js/games/[abbr].js`.

A `copy` block looks like a fenced code block whose info string is the word `copy`, one string per
line:

    ```copy
    # screen-cjar-menu
    Raid the Jar!
    How to Play
    Settings
    ← Back to the Box
    ```

**Rules.**
- Fence tag `copy` is the sole trigger. Prose quotes elsewhere in the document are never checked —
  T5's terminology and T3's rules text are paraphrase, not copy.
- Source of truth is `index.html` plus the game's own plugin file. Nothing else is searched.
- Comparison is on raw text after HTML-entity decoding (`&rsaquo;` → `›`) and whitespace collapse.
- A string present in neither source is a **failure** naming file, line and string.
- Blank lines and lines beginning `#` inside a `copy` block are comments, skipped — this is how a
  block records which screen it belongs to.
- Runs over migrated files only; a game with no identity file is not a failure.
- Node, zero dependencies, exits non-zero on any failure — matching every other `tools/verify-*.js`.

**Expected first run:** failures. Some documented copy is already stale. That is the harness paying
for itself on day one.

**This does not conflict with §13 item 2.** A failure means the transcribed string does not match the
code; the fix is to correct the **document** so it matches what actually ships, and log the bad copy
as a finding for its own task (§15). A pass closes green because the document is accurate, not
because the copy is good.

**Scale, measured on CJAR:** ~147 static strings in its `index.html` block and 82
`textContent`/`innerHTML` assignments in `cjar.js`. After filtering emoji and icon glyphs, expect
**120–180 checked strings per game** — which is why T7b must be nested per screen and not dumped
flat.

---

## 11. Order

Reverse ship order. Newest games are freshest in the documentation and likeliest to need an art or
review handoff; oldest arrive last, with the template fully proven, and are the games the "polished
and then left alone" logic protects best.

```
cjar → pko → flw → shp → frt → nt → pass → dyb → bld → gth
     → dsd → nat → lttp → ygi → jec → ss → gm → li5
```

**CJAR is the exemplar.** It exercises every seam the template must survive: two interstitials, a
tabbed How-to, core art from day one, the private channel, a substantial Sylly Mode, MDLM-only, and
the dynamic-value-line settings pattern. Pass #1 produces both the file and the harness; passes #2
onward are one game each.

**Pass #1 is collaborative on T1, T2 and T4.** Those are new authored prose in the owner's voice,
not extraction. The owner's redlines on the CJAR file become the voice standard for the other 17,
and the finished file becomes the template reference every later pass is written against.

---

## 12. Conventions

**Judgement marks.** T7c and T10's PTP line are opinions, not extracted fact. Both carry a `◇` and
the label `judgement, not spec`. An unmarked opinion in a reference document hardens into a fact
nobody re-examines; marking them tells a future reader exactly which lines a review may overturn.

**Australian English throughout**, per `ui-style.md` § Sylly Tone — including in prose *about* the
games, not only in quoted copy.

**Verbatim copy is verbatim.** T7b reproduces what is on screen, typos and all. A wrong string is
fixed in the code and then in the document, never in the document alone.

**Verified-against stamp.** The header records the SW version and date the file was checked. A file
whose stamp is far behind current SW is suspect, and the harness only guards T7b — not T3, T6 or T10.

---

## 13. Definition of done, per pass

1. `docs/game-identities/[abbr].md` exists, all ten sections present, 15–25 KB.
2. `node tools/verify-identity-docs.js` exits 0.
3. That game's section is gone from `docs/rules/game-identities.md`.
4. Every line of the outgoing section is accounted for — moved, or verified duplicate and deleted.
5. `CLAUDE.md`'s tracker column reads ✅ for that game.
6. Impl-notes entry **only if a genuine lesson emerged**; a routine pass earns none.

---

## 14. Findings the migration will hit

Surfaced while designing this; recorded so no pass has to rediscover them.

**LI5 owns six unprefixed legacy screens** — `screen-menu`, `screen-setup`, `screen-gatekeeper`,
`screen-active-play`, `screen-gameover` — plus one prefixed `screen-li5-monitor`. Grepping
`screen-li5-*` finds one screen and implies LI5 has one screen. The LI5 pass must not trust the
prefix convention, and its T7 flow table is the first place this is written down.

**"Tagline" does not exist in the application.** `game-identities.md`'s `**Tagline:**` field is the
Play CTA label; `screen-lobby` is 18 bare name buttons with no taglines. T1 The Pitch is therefore
new writing, not a rename of an existing field.

**Mode support has a cliff at game 9.** Games 1–8 all support PTP; **every game from GTH (9) onward
is `multiplayerOnly: true`, MDLM-only, except NT (13)** — nine of eighteen. No decision produced
this; each new game inherited the previous config block. T10 makes it visible per game, and the
`Could it be PTP?` line is where the eventual review starts.

**SHP and FLW are the strongest PTP candidates and the least trivial.** Both are turn-by-turn (FLW
is Love Letter, a pass-and-play game in physical form), but both moved their hands to the private
channel in Phase 36. PTP for either needs a Pass-the-Phone Safety Gate per reveal, not a config
flag. T10 records the cost so it is not re-derived.

**FRT's Pear-Off setting rewrites the player range** — `getMaxPlayers`/`getMinPlayers` return 2 when
on, 3–8 when off. A player count that varies with a setting appears in no player-facing document
today; T10's *shape-changing settings* field exists for this case.

---

## 15. Out of scope

- **Application code.** No JS, HTML or CSS changes. No SW version bump.
- **Fixing what the documents reveal.** A pass records the game as it shipped. Copy drift, thin
  journeys and missing PTP support are *findings*, logged and left for their own tasks.
- **Arcade cabinets.** Not Sylly Games (`CLAUDE.md` § Side project); no identity documents.
- **The content guides.** `cjar-`, `gth-` and `ygi-content-guide.md` stay where they are; T4 links
  them rather than absorbing them.
- **A suite-wide index of the 18 identity files.** `CLAUDE.md`'s Quick Index plus the tracker column
  already serve this. Revisit only if the directory outgrows it.
