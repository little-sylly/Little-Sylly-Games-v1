# Phase Snapshot — Phase 37: Pecking Order (PKO), game 17 (1 Aug 2026, SW v148)

**Type:** New game phase (adjacency climbing/shedding card game) + Protocol A phase gate.
**Follows:** Phase 36 (Flawless) + Cartridge System Phase B (asset/skin packs) + the 30 June 2026 Protocol A sweep.
**Gold Master:** 16 games → **17 games** + multiplayer.

---

## Confluence Snapshot

**Decision:** Pecking Order ships as game 17 — MDLM-only, 3–6 players, host-authoritative, host-as-participant, private Hoards via `mpSendPrivate` (the FLW True Network Privacy model). Core loop built, playtested across 3 rounds, verified headlessly (58 + 123 checks), and the Protocol A phase gate is now clean. Force of Nature (Sylly Mode) ships live but inert — a documented Phase 2 exception, owner's explicit call.

**Rationale:** "Who eats whom" replaces numeric rank with an actual predator chain, so beating a card requires knowing the game's theme, not just comparing numbers. Round 2 playtesting found the v6-cut Swarm mechanic was blocking a real stall (Mouse/Fish never having an outlet) rather than protecting against the ambiguity it was cut for, so it was restored alongside a new Appetite dial (Sated/Ravenous) shipped off by default so round 3 can measure Swarm's effect against a clean baseline.

**Technical Impact:** New plugin `js/games/pko.js` (1936 lines), 6 screens + 8 overlays in `index.html`, `data/pko-data.json` (14-entry predator chain), `data/art/pko/` core art pack (17 precached JPEGs, first game to ship one), full MP wiring in `engine-multiplayer.js` (`MP_GAME_CONFIGS.pko`, ACTION/SYNC/private-channel handlers), SW `v147 → v148`. No new architectural pattern beyond what FLW (private channel) and the core-art-pack tier already established — see decision-log for both.

---

## Protocol A — Phase Gate Results (1 Aug 2026)

Ran all four checks against the shipped plugin, cross-referenced against `game-identities.md` § Game 17, `code-map.md`, `engine.js`, `engine-multiplayer.js`, `sw.js`, `css/styles.css`. Re-ran both headless harnesses.

| Check | Result |
|---|---|
| `tools/verify-pko-chain.js` (data-layer invariants, both Appetites) | ✅ 58/58 PASS |
| `tools/verify-pko-loop.js` (turn loop, Swarm, Stampede, Small Fry, conservation) | ✅ 123/123 PASS |
| Screen IDs / settings / scoring / `allScreens[]` / SW precache vs docs | ✅ clean |
| `TODO`/`FIXME`, timer lifecycle, `window.` prefix on `let`-MP-globals, `.pill` removal, overlay teardown | ✅ clean |
| MDLM host-as-participant checks (client early-return, no self-sent ACTION, SYNC renders-only, accumulator reset in-payload) | ✅ clean — the spec's highest-risk item held up |
| Linguistic sweep (Australian English, no generic strings, thematic quit/settings copy) | ✅ clean |
| Mobile layout (the Stack, no `h-screen`/`my-auto` split, z-index, `[?]` how-to wiring) | ✅ clean — `screen-pko-unchallenged`'s bare chrome is the documented interstitial exception |
| How to Play overlay taught the shipped mechanics | 🔴 found: Swarm (shipped round 2) was undocumented and two cards contradicted it |
| SW header comment vs `CACHE_NAME` | 🟡 found: stale `v143` comment |
| Dead scaffolding (`#pko-fon-label`) | 🟡 found: zero JS references |
| Decision-modal border colour | 🟡 found: reused FLW's `#C9A227` gold instead of a PKO tint |
| Touch targets ≥44×44px | 🟡 found: 3 sub-44px inline buttons |
| Protocol A checklist itself | ⚙️ found: "State Variables in `game-identities.md`" item has never been satisfiable — no game has ever carried that table |

All findings fixed in the same session — see Changes Shipped below.

---

## Changes Shipped

1. **How to Play now teaches Swarm.** Step 3 corrected ("one predator per Mark, or Swarm it"), a new Step 4 card added explaining the mechanic, The Poacher card now states it can neither Swarm nor be Swarmed, The Eagle card now names the Swarm-of-two-Eagles answer. Steps renumbered 3–7. Logged as BUG-06 in the impl notes — the lesson is that a mechanic added mid-phase to the builder/chain overlays needs a How to Play pass in the same commit, since that screen has no code coupling to the mechanics it describes.
2. **SW header comment** `v143` → `v148` (`sw.js`), matching `CACHE_NAME`.
3. **Dead scaffolding removed** — `#pko-fon-label` (zero JS references, Phase-2 leftover) deleted from `screen-pko-table`.
4. **Decision-modal borders recoloured** — all three PKO modals (`pko-quit-overlay`, `pko-stampede-overlay`, `pko-new-match-overlay`) moved from FLW's `#C9A227` to `#E4CFA3`, the light tan tint already established on `.pko-card`'s border — matching the DYB/FLW pattern of a lighter tint of the game's own brand colour, not a borrowed one.
5. **Touch targets enlarged** — `btn-pko-chain`, `btn-pko-challenge-reset` (`p-2 -m-2`) and `.btn-pko-chain-open` (`p-1 -m-1`, inline in body text) gained invisible padding to grow their hit area without changing their visual footprint.
6. **`docs/rules/phase-audit.md` corrected** — the drift-check item now points at `docs/code-map.md` instead of a non-existent "State Variables" table in `game-identities.md`.

---

## Files Touched (this phase, cumulative)

| File | Change |
|---|---|
| `js/games/pko.js` | new plugin (full build across Protocol B Steps 0–5) |
| `index.html` | 6 screens + 8 overlays (PKO section) + How to Play/border/touch-target fixes |
| `data/pko-data.json` | new — 14-entry predator chain |
| `data/art/pko/` | new — core art pack (manifest + 17 images) |
| `js/lib/art.js` | three-tier resolution (skin → core art → emoji) generalised for PKO's first use |
| `css/styles.css` | PKO brand classes + card/fan/slot styles |
| `js/engine.js` | `allScreens[]`, `resetToLobby()` teardown, mute-toggle/slider theming |
| `js/engine-multiplayer.js` | `MP_GAME_CONFIGS.pko`, `mpSerialiseSettings`/apply, envelope routing |
| `sw.js` | precache entries + `CACHE_NAME` v145 → v148 across the phase |
| `docs/rules/game-identities.md` | § Game 17 — full section (theme, chain table, settings, mechanics, screens, overlays, MP) |
| `docs/rules/phase-audit.md` | drift-check item repointed at code-map.md |
| `docs/implementation-notes/pko-implementation-notes.md` | DD-21–24, BUG-05, BUG-06, ML entries |
| `docs/decision-log.md` | core-art-pack tier entry |
| `CLAUDE.md` | Current Focus, Per-Game Quick Index |
| `tools/verify-pko-chain.js`, `tools/verify-pko-loop.js` | new — headless verification harnesses |

---

## Deferred / Not Yet Done

- **Playtest round 4** — pending, combined with the first Force of Nature exploration session per the owner's call.
- **Force of Nature (Sylly Mode)** — ships live but inert in v1 (spec §16 Q7, documented exception). Needs its own Stage 2 tech-spec pass before any code is written: unresolved issues carried from the brief (Carrion/Clash-win ordering, Deluge/Dry-Season skip loop, Extinction Event scoring inconsistency, Dark Forest cost/effect, stale Hoard-size arithmetic, Mimic-as-sole-wild) plus newer interactions since Swarm/Appetite shipped (Mimic × Swarm, Great Reversal × Appetite, Extinction Event/Culling × Swarm's Mouse/Fish fuel). Full list: `game-identities.md` § Game 17 → Force of Nature.
- **Decision-modal border colour (item C) and touch targets (item D)** were judgement calls, not spec violations — flagged at the gate, fixed same-session at the owner's request rather than left open.

---

## Verification

- `tools/verify-pko-chain.js` — 58/58 PASS (data-layer invariants, both Appetites).
- `tools/verify-pko-loop.js` — 123/123 PASS (turn loop, Swarm, Stampede, Small Fry, Retreat/Unchallenged, conservation).
- Both harnesses re-run after the Protocol A fixes — no regressions.
- Grepped the edited `index.html` region post-fix for mojibake (em dashes, apostrophes, curly quotes) — clean; edits were targeted `Edit` calls, not a systematic script, so the encoding-corruption risk documented for bulk changes doesn't apply here.
- No live-browser playtest was run as part of this gate — the three playtest rounds already completed (and round 4, pending) are the functional verification; this session was documentation/audit only.

---
