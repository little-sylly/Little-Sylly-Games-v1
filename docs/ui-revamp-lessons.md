# UI Revamp — Lessons Learnt

**On-demand — read it at the start of any game's revamp pass (R1) and again at R13 (the pass's close).**
Companion to `docs/rules/ui-revamp.md` (the rules) and `docs/ui-revamp-rollout.md` (the tracker). This is
the *what bit us* list.

## How to use it

- **One entry per lesson, newest at the bottom.** Each starts as a title + a line or two — enough to
  act on. Nothing else.
- **When the same lesson bites again, grow the entry — don't add a duplicate.** Add a dated line under
  **Seen again**: which game, what exactly happened, and anything the first write-up missed. If it turns
  out to be a symptom of something bigger, write that underneath as **Underneath**.
- **A new lesson goes in at the end of the pass that found it** (R13), in the same commit as the
  closure docs. If it changes a rule, also propose the edit to `docs/rules/ui-revamp.md`.
- Format: `### L# — Title` · **Do** (one line) · **Why** (one line) · **Seen:** game + date.

---

### L1 — Team games: host Auto-assign + two Start warnings
**Do:** every team game's Line-up gets **Auto-assign the rest** (host; fills the Unassigned into the
smallest team, picks stay) beside **Shuffle teams**, and the host's **Start** is live as soon as the
Line-up is valid — no waiting for everyone's *I'm ready*. Tapping Start warns: (1) players with no team →
*Auto-assign and start*; (2) players not yet ready → *Start anyway* / *Wait*.
**Why:** a table waiting on one slow phone is the commonest stall; the host knows when the room is ready.
**Already built, engine-generic** (`mpIntroHostAutoAssign`, `mpIntroHostStartTap`, `game-intro-start-overlay`)
— a game with `intro.lineup` gets it free. Keep `minPerTeam` / `balanced` honest: they still block Start
(auto-assign cannot fix a rule the roster can't meet).
**Seen:** LI5, 10 Nov 2026 (owner playthrough). The 20 s *Start anyway* timer it replaces is gone.

### L2 — Hunt the old styling the moment a world lands
**Do:** at the end of every screen build, grep for what the *old* look left behind — off-brand colour
families, emoji icons, Tailwind colour classes baked into JS template strings, `css/styles.css` rules
for the game, and overlays the pass didn't "own".
**Why:** the world is applied screen by screen, so the screens you didn't touch keep the old skin and
nobody sees it until a playthrough.
**Seen:** LI5, 10 Nov 2026 — Extra Credit was still **purple** (`#a855f7` / `#c084fc` / `#d8b4fe`, set in
`.li5-sylly`) after the board went pink; Yay was still emerald and Nay red (the signed-off board had pink /
black); the Report Card used ✅ ❌ ⏩ and green/red. **Check list:** purple/violet/emerald/red/`team-box`,
`REVIEW_ICONS`-style emoji maps, `text-stone-*` on a dark board.

### L3 — Terminology and phrases follow the world, in every string
**Do:** when the world renames something (*Playgroup → group*, *stars → tallies*), grep the **JS** as well
as the partial — labels set via `.textContent`, `confirmBtn.textContent = …` in click handlers, pool
arrays, feed text — then the identity doc's copy blocks.
**Why:** `verify-identity-docs.js` proves the doc's strings exist in source; it cannot tell you a stale
string *isn't* still there.
**Seen:** LI5, 10 Nov 2026 — *New Playgroup!* survived in a click handler after the overlay copy changed.

### L4 — Overlays and modals are part of the screen set
**Do:** list every overlay in R3 (quit, play-again, history, Report Card, tips, how-to) and give each a
fate, even "keep". Quit / play-again take the world's modal class (`li5-modal` is the reference).
**Why:** they are reached last in a playthrough, so they get restyled last — or never.
**Seen:** LI5, 10 Nov 2026 — the quit overlay's copy and skin were left behind until the owner's playthrough.

### L5 — One action palette, everywhere a word or result is listed
**Do:** pick the action colours once (LI5: **pink** = Yay, **yellow** = Skip, **grey** = Nay) and use them
on the live feed, the Report Card and the history. Positive/negative colours (green/red) are a second,
competing palette — don't mix them in.
**Seen:** LI5, 10 Nov 2026.

### L6 — A privacy rule can be relaxed on purpose — update the harness, don't delete it
**Do:** when playtest says a hidden thing should show (LI5: a *resolved* word now travels to guessers),
change the rule in the spec, change the harness check to the new rule (still asserting the *current* thing
never travels), and note the residual risk (a re-drawn skipped word).
**Seen:** LI5, 10 Nov 2026.

### L7 — Measure before fixing a layout report; test the worst-case strings
**Do:** a "scrolls at ≤548 px" report is a hypothesis. Re-measure at 320×452, 375×548 and 375×667 with
the *longest* real content (Extra Credit's 10 words, long team names, a 14-word Report Card) before
touching CSS. Variant modes (more words, more rows) are the ones that break first.
**Seen:** LI5, 10 Nov 2026 — the logged Extra Credit scroll did **not** reproduce after the S5 short-phone
rules (tray bottom 439 / 535 inside the viewport, no scroll, even with 15-letter words); a 2 px overflow at
320×452 was the only real finding. Log a layout bug with its measurement, not a feeling.

### L8 — Check the build against the signed-off board, line by line
**Do:** at the end of each screen, read the board's tweak list and the owner's round-2 notes against the
shipped CSS — button colours, sizes, order (*Yay left of Nay, bigger, pink*).
**Why:** the build follows the plan's *structure* and quietly keeps the old *values*.
**Seen:** LI5, 10 Nov 2026 (the Yay / Nay colours; see L2).

### L9 — Harness and tooling quirks (so you don't re-discover them)
- **Headless visual-check:** the first `showScreen()` after load can be undone by lobby boot — wait ~3 s,
  seed state, and call your show function twice. Screenshots are slow/hang sporadically while the 3D
  lobby renders; measure geometry (`getBoundingClientRect`) as the dependable half. Seed `activeGameId`.
- **Scratch scripts:** write drivers with the Write tool, not a long bash heredoc (a multi-hundred-line
  heredoc died mid-parse once).
- **Intro harness:** a change to the Start gate touches `verify-game-intro.js` § 6–9 and the
  `mutate-game-intro.js` mutants that name Start; update both in the same commit.
**Seen:** LI5, S4–S8.

---

## Candidates (seen once, not yet a rule — promote on the second sighting)

- Engine-owned screens (Intro brief, Line-up) can't take a game's skin (departure D7); watch whether GM
  wants a `lineup` render hook.
- The chalk write-on and duster are world-specific; a new world needs its own scene kit, not a reskin of
  `li5-scene.js`.
