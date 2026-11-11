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
**Seen again:** E.T.A., 10 Nov 2026 — renaming the narrator (*Dot → Dotty*) and the game (*ETA? → E.T.A.*) reached
`data/eta-data.json` quips (the old voice's "love"), `lobby-games.js` (`pitch`, `howItGoes`), a generated file
(`games.raw.json` ← `build-games.js` ← the identity doc) and a harness pin (the rank name). **Underneath:** a
world rename is a sweep across **content and registries**, not just copy — grep `js/ src/ data/ tools/data/`.

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
**Seen:** LI5, S4–S8. **Seen again:** HSG S4, 11 Nov 2026 — a 3 s wait was not enough: the lobby boot
took the screen back ~5 s after load, and a later context lost it mid-run. Wait 8 s, and re-`showScreen`
before every click and screenshot (an `ensure()` helper), not just once.
**Seen again:** HSG S5, 12 Nov 2026 — a driver written without `ensure()` lost the first seeded screen at
2 of 3 sizes, even after the 8 s wait. **Underneath:** `ensure()` belongs in the driver template, not in
memory. Check `style.display` of the target section before every measure and every shot.
**Seen again:** HSG S6, 12 Nov 2026 — even with the 8 s wait and a double seed, one variant in six still measured `display:none`. Seed **three times** with 400 ms between, and treat a `shown:"none"` row as a flake to re-run, never as data.

---

### L10 — An engine-owned screen takes a skin through text hooks and CSS, never a render callback
**Do:** when the Intro (or any engine screen) needs the world, add a tiny optional **text** node to the
game's template (`data-intro-roll`, `data-intro-ready-tag`) and a CSS custom property the game sets from
its own stylesheet (`--intro-stamp`); scope any box change to the game's scene (`#game-intro-scene:has(> .eta-intro)`).
**Why:** a render hook would hand game code the engine's DOM; text + a variable keeps every other game
byte-identical and is assertable both ways (`verify-game-intro.js` § 19).
**Seen:** LI5 (D7, 10 Nov 2026) — the Line-up couldn't take the chalkboard. **Seen again:** ETA, 10 Nov 2026 —
the roll call needed *Sign the timesheet.* / *CLOCKED ON*, and the 16:10 scene box clipped Dot's clipboard.
**Seen again:** HSG S5, 12 Nov 2026 — the third scene in a row to need `aspect-ratio: auto` on
`#game-intro-scene` (a `beat()` scene carries its own line card, so 16:10 is never right). Its own
line card also stacked a second speaker label on the engine's narrator card (hsg TG-03). **Promote at the
batch boundary:** a scene with `beat()` sizes its own box and shows the line, not the speaker.

## Candidates (seen once, not yet a rule — promote on the second sighting)

- A new game's board helpers are mockup code: port the values, then check the helpers against the brief's own
  strings (ETA: the board's `num()` turned *12.5 days* into *13 days*).
- The chalk write-on and duster are world-specific; a new world needs its own scene kit, not a reskin of
  `li5-scene.js`.
