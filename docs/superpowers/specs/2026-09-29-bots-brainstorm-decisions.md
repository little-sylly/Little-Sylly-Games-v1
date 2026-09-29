# Bots — brainstorm decisions so far (29 Sep 2026)

Owner + Claude, brainstorming skill, **architectural path**. This is the record of what has been
DECIDED in conversation; the design sections and the written spec come next. Not a spec.

## The job
- **Both** uses (owner picked "C"): bots **top up a small lobby** (e.g. two friends below Cold
  Shoulder's minimum of 3) AND **solo play** (one person, one phone, a full match against bots).
- **First game: Cold Shoulder (`cld`).** Seeded in the **engine** as an opt-in so later games can use
  it. Likely next adopters: **PKO, PASS, The Bluff (DYB)**. Not planned: NT (maybe training only),
  COMB (top-up would be much harder).

## Decomposition (three sub-projects, each spec → plan → build; brainstorm them together)
1. **Engine bot seats** — the foundation (lobby, roster, frozen seats, reconnect/Away exclusion, the
   game hook, Solo's transport).
2. **Cold Shoulder's bot brain** — strategy and difficulty.
3. **Solo mode** — a full match on one device, no Firebase.

## Decisions
- **Difficulty: one setting, Easy / Medium / Hard, chosen by the host; one difficulty for ALL bots in a
  match.** Easy aims loosely and picks naively; Medium is the reactive heuristic; Hard uses look-ahead
  (candidate shoves run through the real, pure, deterministic `Physics.simulate`). **Personalities are
  parked** (owner: "C is tempting but let's go B for now").
- **Adding bots: the host adds them by hand** — a "+ Add bot" control in the host lobby, one seat at a
  time up to the game's max, removable. Available any time, including when nobody else joins (a lone
  host can fill the room and play; that path does use Firebase).
- **Identity: named, with a small 🤖 marker** in the lobby roster, scoreboard and podium. **Names are
  game-owned** (each game brings its own pool). Cold Shoulder's pool, drawn in order, skipping any
  name a human in the room already has: **Sylvia, Sam, Shirley, Jeff, Chillbert, Waddles, Fishstick,
  Flipper, Slushie** ("Snowball" rejected — it collides with the thrown Snowball).
- **Solo in two places:** (1) the engine's "How are you playing?" mode screen gains a fourth style,
  **Solo**, alongside PTP / TLM / MDLM — engine-level, opt-in per game via `supportedModes`, a small
  setup (how many bots, difficulty), no Firebase; (2) the lobby's "+ Add bot" (above).
- **Pacing: bots take a short, varied "thinking" pause (~1–4 s, longer on Hard) before locking in**,
  so the tally fills like real players. A bot decides from the ice as it stands at the START of the
  Slide and never sees anyone's aim; the host holds its move until the pause ends.
- **Architecture: approach 1 — host-side bot seats.** A bot is a roster slot the host owns (a made-up
  id like `bot:0`, tagged `bot: { name, difficulty }`); frozen into `seats` at `GAME_START`; ignored
  by presence / Away / rejoin. A game opts in with a hook in `MP_GAME_CONFIGS[abbr]`, roughly
  `bots: { names, decide(seatIdx), thinkMs }`; the host calls `decide` per bot seat, waits the pause,
  and records the move through the host's own path. **Fairness contract:** `decide` sees only what that
  seat could see (the reconnect `sendState(idx)` stripping pattern) — checked by a harness (a bot's
  decision is identical whatever the other seats' hidden state is). **Solo = the host path on a null
  wire** (no Firebase, broadcasts go nowhere, every other seat a bot). Rejected: bots inside each game
  only (duplication), bots as virtual phones (heaviest; its fairness-by-construction is replaced by the
  harness check).

## Existing code to build on
- `cldPrBotCommit(d, i)` / `cldPrPlanTarget` / `cldPrRefreshPlans` in `js/games/cld.js` — Practice's
  plan-based bots (pure over the Arena record; Edge's pool cut). A starting point for the brain.
- The Practice Arena (`cldArenaRun` swap) proves a local match on the real rules.
- No other game in the suite has bots.

## Next
Present the design in sections (engine seats + lobby → the game hook + fairness → Solo → the CLD brain
and difficulty → testing), approve each, then write the spec to
`docs/superpowers/specs/2026-09-29-bots-design.md`, self-review, owner review, then writing-plans.
