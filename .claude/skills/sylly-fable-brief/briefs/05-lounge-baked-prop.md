# Task 5 — Lounge baked set-piece: a one-prop pilot

**Mode:** Plan → build pilot · **Tier:** 2 (a vendored loader, a new binary asset class, a new pipeline) ·
**Needs:** Blender available in the session (Blender MCP or headless `bpy`) **and** the owner's approval of
step 0's cost proposal · **Sessions:** 1 for step 0 → ⏸, then 1–2 for the pilot
**Summary below written 12 Nov 2026 (SW v291).** Check it against the sources before relying on it.

## Why this

The Lounge is the suite's front door. It's the **boot layout** (`LOBBY_INIT.view: 'lounge'`,
`js/lobby/lobby-router.js` ~line 27) and the most crafted thing in the app. It still doesn't read as the
warm toy diorama the brief asked for, and real-time lights in Three.js r128 can't give it bounce light or
ambient occlusion. A baked prop (modelled and lit in Blender, light baked into a texture, exported as
glTF) can. This is taste work on a new pipeline, so it's a good fit for Fable, but it changes what the
install carries, so the cost comes first.

## Where things stand

- **All procedural JS:** `js/lounge/lounge-lib.js` 156 KB, `lounge-room.js` 127 KB, `lounge-props.js`
  275 KB (~560 KB of geometry-as-code), plus `lounge-scene.js` 49 KB and `lounge-sfx.js` 13 KB.
- **Lighting:** a VSM sun with `shadowMap.autoUpdate = false`, re-rendered only on demand
  (`lounge-scene.js` ~lines 100–260; the VSM-vs-PCFSoft reasoning is at ~line 204).
- **Three.js r128 vendored, without GLTFLoader.** Loading a `.glb` means vendoring the loader, which is a
  cost-envelope Tier 2 item ("a new small library": its own size, precached, forever).
- **The candidate hero prop:** the arcade cabinet in the bookshelf's bottom bay (SW v258;
  `lounge-props.js`, Grep `arcade`). The Arcade Floor (SW v260) reuses that same cabinet model, so a baked
  version would show in two places. Check that it's still the best pick.
- **Design history:** `docs/superpowers/specs/2026-09-18-premium-lounge-scene-design.md` (the original,
  § 15 cost envelope) and `2026-09-19-premium-lounge-reblock-design.md`, which wins where they disagree.
  The visual reference images are in `wip/premium/`.

## Pain points

1. **It's slow to load on phones**, and as the boot layout it's the first thing anyone waits for. Baking
   **does not fix this**: it is a quality gain, not a speed fix. Don't sell it as one. Staged loading
   (the shell first, props later) is the speed fix, and it belongs in the same plan as a separate item.
2. **The room reads flat and too light** next to the reference (the re-block spec § 1 has the numbers).
   Bounce and AO are what's missing.
3. **Geometry-as-code is slow to iterate on.** Every prop change is a JS edit plus a reload. A scripted
   Blender source is just as reviewable (script as the source of truth) and far quicker to judge by eye.

## Read first

1. `docs/cost-envelope.md`: §§ 2, 4, 5, 9.
2. `docs/superpowers/specs/2026-09-19-premium-lounge-reblock-design.md`, whole (24 KB). The original spec:
   § 15 only.
3. `js/lounge/lounge-scene.js` ~lines 100–260. `js/lounge/lounge-props.js`: Grep `arcade`, read that prop.
4. `docs/rules/ui-lobby-layouts.md` (the Lounge section).
5. Account skills: `blender-scripted-modelling` (workflow, web export) and, if it's useful,
   `exploded-object-showcase`.
6. `memory/feedback_props_physical.md` (props built like real products: parting lines, seated parts,
   fasteners, a fun touch).

## The result we want

**Step 0 — the cost proposal** (`docs/cost-envelope.md` § 4 Tier 2 format): GLTFLoader for r128 (exact
size, vendored to `js/lib/`); a per-file target for the `.glb` and its lightmap **stated before
anything is made** (PKO TG-02); which caching contract each one takes (§ 5: precache vs runtime cache,
and what the Lounge shows while a runtime-cached prop is still on its way); what it would mean if the
whole room went this way later. Add the staged-loading item with its own measured before number (time
to first Lounge frame on a throttled profile). **Owner gate:** mark ⏸ until approved.

**Step 1 — the pilot, one prop only:**
- a Blender script that builds the prop (the source of truth, committed), plus the bake, plus the export;
- the prop loaded in the Lounge **and** on the Arcade Floor, keeping its existing interactions (the press,
  the bop, the tab order), the controller's colour inheritance where it applies, and reduced motion;
- a fallback: if the `.glb` fails or hasn't arrived, the procedural prop renders as today;
- before/after renders at 375×667 for the owner, and the install delta measured against the target;
- the timer/RAF lifecycle and one-WebGL-context rules still hold.

**Owner measures:** the iPhone SE holds 60 fps (`?fps`) and the prop reads warmer. If it doesn't, the
pilot's finding is "no", and that's a valid outcome. Record it and stop.

## Verification

`node tools/visual-lobby.js` (the router seam proof, plus its mutation pass) · `visual-lounge.js` (note: its
keyboard dial check is already stale, see task 7) · `visual-check` of the Lounge and the Arcade Floor at
the three sizes · `sw.js` `CACHE_NAME` bump if anything is precached · an offline install check
(`docs/art-authoring-guide.md`).

## Progress log

*(append: date · what was done · commits · where it stopped · next concrete step)*
