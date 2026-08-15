# Net-Trace — Debug / Sandbox Mode: raw owner brief

**Status:** RAW INPUT, not a spec. Captured verbatim 16 Aug 2026 at the end of the allocation-hub
polish session, so a fresh planning session starts from the owner's own words rather than a
paraphrase. **Nothing here is settled** — the open questions at the bottom are real and were not
answered in the capturing session.

**Next step:** brainstorm → tech spec → plan (Opus, high effort). Implementation is a separate
session after the plan exists.

---

## The owner's brief (verbatim)

> i want to create a debug mode (or sandbox mode) thats like a free build free test simulation mode
>
> Settings: Debug Mode ON/OFF toggle - sits just above sylly mode
>
> I supposed it can work with multiplayers and also MDLM. let me think this through
>
> Rules
>
> starts off blank maze canvas
>
> you can build your own 'template' which means native firewalls+honeypots (matching the honeypot
> limit settings) and allocate the firewall+honeypot resources
>
> so i suppose it would be similar to how you play now except its clear that you are setting the
> stage + locking in the NATIVE placements
>
> resource allocation will have its own selector - you can decide the best way for this system
>
> include a randomise options for both native allocations + resources (player can then use this as a
> starting to edit before 'locking in'
>
> i suppose in this mode, only the host or admin 0/player 1 (for PTP) debugs/creates the maze
>
> once locked in, players play as normal HOWEVER we want it to be a sandbox mode, you can submit as
> many tries as you like - i think the way to do this is build > submit > asks for retry or end >
> retry > retry > end > wait for other players (special debug mode so lets just
>
> not compatible with sylly mode (i think too much work), just have it disable one another upon
> either selection (we should have this function in our rules - where sometimes a setting will
> disable another setting).

*(The "so lets just" sentence trails off in the original — the retry-loop end condition was still
being thought through out loud. Do not assume what it was going to say; ask.)*

---

## Terminology check before planning

The brief says "native firewalls+honeypots". Per the glossary settled in `nt-implementation-notes.md`
**D35**, NT already uses these three tiers, and "native" means something specific:

| Tier | Terms | What it is |
|------|-------|------------|
| **Generated** (terrain) | Bad Sector, Native Honeypot | Pre-placed by `ntGenerateNode`, never player-controlled |
| **Budget** (`ntInventory`) | Firewall Segment, Honeypot | What a player may *place* during Build; random roll per cycle |
| **Surplus** (`ntAllocationPool`, DNP only) | FW / HP | Extra deposits a captain moves between legs |

There is **no such thing as a "native firewall"** today — the terrain tier has Bad Sectors (inert
obstacles) and Native Honeypots (hazards) only. So "build your own template … native
firewalls+honeypots" is proposing something new: either authoring the **Generated** tier directly
(Bad Sectors + Native Honeypots), or a new authored tier. **Resolve this first** — it changes what
the authoring UI is actually editing.

---

## Open questions (none of these were answered)

1. **What exactly is authored?** Bad Sectors + Native Honeypots (the existing Generated tier), or
   also pre-placed Firewall Segments? The phrase "native firewalls" has no current referent.
2. **Retry loop end condition.** The brief's sentence trails off. Does "end" mean this player is
   done and waits, or does it end the whole session? Can a player retry *after* choosing end?
   What does everyone else see while one player is on their fourth attempt?
3. **Does the maze author also play?** Brief says host/admin-0 "debugs/creates the maze" — do they
   then build and submit on it too, or only spectate?
4. **What carries over between retries?** Fresh empty grid each attempt, or does the previous
   attempt's placement stay as a starting point to tweak?
5. **Is DNP's multi-leg bridge in scope?** DNP is a Sylly Mode, and Debug is stated as mutually
   exclusive with Sylly Mode — so Debug is presumably **Standard single-node only**. Worth
   confirming, because it decides whether any of the allocation-hub work applies at all.
6. **Scoring/SER in sandbox.** Still computed and shown per attempt (likely the whole point), but
   does anything persist to the match summary, or is it all throwaway?
7. **Where does the authored maze live?** Memory-only for the session, or saveable/shareable? (Note
   `CLAUDE.md` § Anti-Patterns: no `localStorage` for game state.)

---

## Constraints already known (don't re-derive)

- **Mutually-exclusive settings is a NEW suite-wide pattern.** The owner explicitly wants it as a
  rule, not a one-off. No game currently has two settings that disable each other — check
  `ui-style.md` § Settings Layout Standard and add the pattern there once designed.
- **Toggle sits directly above the Sylly Mode card**, which is currently always the last card in
  every settings overlay (`ui-style.md`). A second-to-last special card is itself a small precedent.
- **The MDLM quit contract, readyCheck gating, and the "host processes its own submission directly"
  rule** all apply if this is multiplayer — see `logic-engine.md` § MDLM Patterns. A per-player
  retry loop where players finish at different times is a **new readiness shape** for this codebase
  and is the most likely source of MP bugs.
- **`tools/verify-nt-loopback.js` (146 checks) must stay green**, and any new packet needs coverage
  in it — it is the only harness in the suite with a real wire *and* render-executing mock DOM.
- NT's build screen already has all the placement interaction (`ntAttemptPlace`, long-press upgrade,
  right-click honeypot, `ntPathExists` validity gate). An authoring UI should reuse it rather than
  build a second placement surface.
