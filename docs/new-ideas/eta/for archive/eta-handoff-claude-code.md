# ETA? — Handoff to Claude Code (Stage 2: tech spec)

**Written:** 10 November 2026, end of the Stage 1b session (world + directions).
**Owner:** Sam. **Next model:** Opus, high effort (new game = Tier 2). **Session:** fresh.

Everything Claude Code needs is in this folder, `docs/new-ideas/eta/`:

```
docs/new-ideas/eta/
├─ eta-handoff-claude-code.md        ← this file
├─ new-game-brief-eta-v4.md          ← THE BRIEF (source of truth; §0 world, §0d pick, Stage 2 appendix + build plan)
├─ boards/
│  ├─ depot-directions/              ← Stage 1b canvas files
│  │  ├─ Main.dc.html                ← PICKED: "1 · Clipboard" — Run Sheet + Proof of Delivery
│  │  ├─ Intro.dc.html               ← Intro scene (Dot's toolbox talk, brief, timesheet)
│  │  ├─ DocketWall.dc.html          ← not picked
│  │  ├─ LoadingDock.dc.html         ← not picked
│  │  └─ canvas.json
│  └─ reveal-mockups-round1/         ← October/16 Oct round (pre-world)
│     ├─ Backseat.dc.html            ← reference for Sylly corrections MECHANICS only
│     └─ Main / Waybill / Radar .dc.html + canvas.json (history)
├─ eta-maths-round-1.md              ← scoring numbers and reasoning
├─ eta_sim.py                        ← simulation (re-run if numbers change)
├─ eta-handoff-content-and-board.md  ← October handoff; §4 = content rebuild (still open)
├─ new-game-brief-eta-v3.md          ← superseded by v4
└─ New folder/new-game-brief-eta.md  ← original brief (superseded; content proof of concept)
```

Live canvases (owner's claude.ai account): depot directions https://claude.ai/artifact/XbRGjGcNHhoE9HkfPWhd8W · round 1 https://claude.ai/artifact/Dg2NScTQR8NkuGEBxUcBce

---

## Paste this into Claude Code

```
Task: Stage 2 (technical spec) for the new game ETA? (`eta`). Stage 1 + 1b are done.
Read first: docs/new-ideas/eta/eta-handoff-claude-code.md, then
  docs/new-ideas/eta/new-game-brief-eta-v4.md (WHOLE — incl. §0, §0d and the Stage 2 appendix/build plan),
  docs/rules/new-game-process.md § Stage 2, docs/rules/ui-revamp.md §§ 2–5, docs/ui-revamp-lessons.md,
  docs/rules/new-game-technical-template.md, and the rule files Stage 2 lists.
Boards: docs/new-ideas/eta/boards/depot-directions/Main.dc.html (picked) and Intro.dc.html are the visual
  source of truth; Backseat.dc.html (round 1) is the Sylly-corrections mechanics reference only.
State: world, brand colour (hi-vis orange #EA580C), terms and ranks are locked; scoring numbers are
  [MATHS] v1; the CONTENT SET (Routes/Rides/Briefing lines) is NOT built — spec the data format only.
Do: 1) move v4 to docs/new-game-brief-eta.md (keep v3 + the original in docs/new-ideas/eta/ for the gate
  archive); 2) run the Consistency Audit (terms vs every identity doc's T5 — esp. Run Sheet, Talk Me
  Through It, Job docket, Timesheet, Shift, Courier; pill-active-eta; abbreviation); 3) fill
  docs/new-game-tech-eta.md via /brainstorm; 4) list §16 clarifications (fonts, controls shade, Run Sheet
  scale re-fit at Proof of Delivery) and §17 deviations; 5) add a decision-log entry (Confluence
  Snapshot below). Present the spec and STOP.
Constraints: NO game code before I confirm the spec. Brief wins over boards on rules; boards win on
  look/motion (L8). No truth or Ride speed may reach a client before Proof of Delivery. MDLM only.
  Australian English, metric.
Model + effort: Opus, high.
```

---

## What changed since v3 (for the reviewer)

- **World:** E.T.A. Couriers — *Every Thing, Anywhere. Eventually.* The vans are all out, so couriers take whatever is left in the shed. Narrator **Dot, Depot Manager**; the Intro is a toolbox talk on the loading dock at dawn; the roll call is "Sign the timesheet".
- **Direction:** 1 · Clipboard (paper, letterhead, hi-vis tape bars with a reflective sheen, parcel drops on the truth, rubber-stamp verdicts, Dot's note).
- **Brand colour:** hi-vis safety orange — controls `#EA580C`, scene `#FF6A13` + silver stripe.
- **Renames:** Dispatch Board → **The Run Sheet** · Radio Defense → **Talk Me Through It** · Dispatcher's Double-Take → **Dot's Double-Take** · Clock Out? → **Clock Off?** · new rank ladder (Work-Experience Kid → Dot's Favourite; thresholds unchanged).
- **Rides:** new `mode` field (Land / Sea / Air / Space) drawn as a badge; emoji optional.
- **Sylly:** Spin-out / Back on Course now stamp at **Proof of Delivery** (they need the truth).
- **Mechanics and numbers:** unchanged.

## Things the spec must answer (owner decides at confirmation)
1. **Fonts** — self-host stencil / typewriter / marker subsets (propose a size ceiling per `cost-envelope.md`) or system stacks.
2. **Controls shade** — `#EA580C` passes white ink only at large/bold sizes; switch to `#C2410C` if any brand-filled control has smaller text.
3. **Run Sheet scale** — computed from Logged ETAs only until Proof of Delivery, then re-fitted to include the truths (no leak through the axis).
4. **Intro skin** — how much of the clipboard look the engine-owned Intro panel can take (revamp lessons, candidate note).
5. **Content data format** — Route / Ride (with `mode`) / Briefing line schema, ready for the separate content rebuild.

## Confluence Snapshot (for `docs/decision-log.md`)
- **Decision:** ETA? enters Stage 2 with its world set (E.T.A. Couriers, narrator Dot), direction 1 · Clipboard picked, brand colour hi-vis orange, and the Dispatch Board / Radio Defense renamed to The Run Sheet / Talk Me Through It.
- **Rationale:** North Star (9 Nov 2026) — the world, not the mechanic, makes the game ours; the paperwork world keeps the reveal fun without reading as a racing or sci-fi game, and drops radio language now owned by Great Minds' history.
- **Technical Impact:** new brief `docs/new-game-brief-eta.md` (v4); boards in `docs/new-ideas/eta/boards/`; future `pill-active-eta`; Ride data gains `mode`; no code yet.

## After the spec (not this session)
- **Content rebuild** (old handoff §4 + `mode`) — its own session, Opus or Sonnet high.
- Build (Sonnet) from the board + build plan; the corrections reveal reuses `Backseat.dc.html`'s logic, restyled as red-pen amendments.
