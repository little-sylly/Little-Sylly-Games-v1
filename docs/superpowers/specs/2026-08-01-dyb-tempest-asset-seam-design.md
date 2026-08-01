# Design — Tempest special dice through the asset seam

**Date:** 1 August 2026
**Game:** The Bluff (`dyb`), game 10
**Type:** Shared asset-pack schema extension + DYB render-seam rework
**Closes:** the standing caveat in `docs/expansion-guide.md`'s `faces` cheat-sheet — "**standard
dice only** — special Tempest dice keep their pip styling so the type stays legible". (Checked:
this limitation is *not* recorded in `docs/deferred-work.md`; the cheat-sheet row is its only
home.)

---

## 1. Problem

DYB's Sylly Mode (**The Tempest**) gives every die a chance to become one of five special
types — `loaded`, `phantom`, `slick`, `cracked`, `snake`. Each type is identified visually by
four style channels computed in `dybDieHTML` (`js/games/dyb.js`): **border colour**, **background
tint**, **glow / animation** (`extraCls`), and **pip colour / shape**.

The asset seam added in Cartridge Phase B is gated to `type === 'standard'`:

```js
if (type === 'standard') {
  const url = (typeof assetFace === 'function') && assetFace('dyb', val);
  if (url) return `<div class="dyb-die dyb-die-asset" style="background-image:url('${url}')"></div>`;
}
```

The gate exists because `.dyb-die-asset` (`css/styles.css`) sets `border-color: transparent;
padding: 0; display: block` — it deliberately discards every channel the `switch` block just
computed. The image covers the pips (pip signal gone) and the tint sits behind it (tint signal
gone). Only border and glow *could* survive, and the class throws both away.

Consequence today: a player running `sea-cliff-dice` or `deep-ocean-dice` sees beautiful art on
standard dice and raw CSS pips on every special die in the same hand.

Two further facts shape the design:

- **Three of the five types render a glyph, not a face** — phantom-in-hand `?`, cracked `✕`,
  unassigned-slick `4*`. A schema keyed only by face value `1`–`6` cannot address them, and
  `cracked` *never* shows a face, so it would be permanently unskinnable.
- **`phantom` compounds.** At the Overlook a phantom die unmasks to a *secondary* type
  (`loaded` / `snake` / `slick` / `cracked`) and renders that type's styling plus an additive
  indigo `.dyb-die-phantom-ring`.

## 2. Goals / non-goals

**Goals**

- A skin can restyle any special die.
- A skin that supplies **no** special art still looks coherent — its standard face art, framed
  in the engine's type colour, not raw pips.
- Type stays legible at a glance by default; a pack author may take that responsibility
  deliberately, never accidentally.
- The schema addition is safe for every existing pack across all games.

**Non-goals**

- **No DYB core art.** `data/art/dyb/` is not created. Dice need alpha (they are not full-bleed
  rectangles), which means a PNG pipeline run for up to 32 images plus `PRECACHE_URLS` entries —
  a separate task that would block this schema decision behind an art run.
- **No rules change.** `dybGenerateRoll`'s type-assignment odds, `dybComputeRealCount`'s
  arithmetic, and the Chaos-level slider are untouched. This is a render-seam change only.
- **No PASS core art.** Explicitly out of scope; default CSS cards stay.

## 3. Schema — the `specials` block

One new **optional** key on the shared `assets` block:

```json
"assets": {
  "kind": "dyb",
  "basePath": "img/",
  "faces": { "1": "1.svg", "2": "2.svg", "3": "3.svg",
             "4": "4.svg", "5": "5.svg", "6": "6.svg" },
  "back":  "back.svg",
  "specials": {
    "loaded":  { "1": "l1.svg", "2": "l2.svg", "3": "l3.svg",
                 "4": "l4.svg", "5": "l5.svg", "6": "l6.svg", "frame": false },
    "snake":   { "3": "s3.svg" },
    "slick":   { "1": "k1.svg" },
    "phantom": { "blank": "ghost.svg", "4": "ph4.svg" },
    "cracked": { "blank": "broken.svg" }
  }
}
```

Three key shapes inside a type, none of which can collide:

| Key | Meaning |
|-----|---------|
| `"1"`–`"6"` | The image for that type showing that face value |
| `"blank"` | The image for that type when it shows **no face value** |
| `"frame"` | Boolean, default `true` — see § 5 |

`"blank"` rather than `"hidden"`: a cracked die is fully visible to everyone, it simply has no
face to show. `"blank"` is honest for both it and the concealed phantom.

**Compatibility.** `specials` is absent from every pack in the repo (`dota2`, `monsterhunter`,
`pokemon`, `neon-fruit`, `neon-sheep`, `neon-deck`, `deep-ocean-dice`, `sea-cliff-dice`, `joker`,
`fruity-fruits`, `plush-sheeps`, `prismatic-gems`) and from all four core art packs (`pko`, `flw`,
`frt`, `shp`). Every resolver path below returns `null` on a missing block, so absent `specials`
means byte-identical behaviour to today.

**Generality.** `specials` is a shared-format addition, not a DYB field. Any game whose ids carry
a *modifier* orthogonal to the face value can use it later. No other game is changed here.

## 4. Resolution — `js/lib/art.js`

Two new functions beside `assetFace` / `assetBack` / `assetExtra`:

```js
// The image for a modified face: skin → core art → null.
// id is a face value or the reserved string 'blank'.
assetSpecial(kind, type, id)   // → url | null

// Whether the engine draws its own type chrome around that art.
// False only when a tier explicitly opts out.
assetSpecialFrame(kind, type)  // → bool (default true)
```

Both use the **same skin → core → null chain** as `assetFace`, and the same **per-key**
fallthrough: a skin covering `loaded.4` but not `loaded.5` gets core art for the 5. This mirrors
`assetFace`'s documented behaviour exactly ("a partial skin falls back to the real art rather than
to emoji"), keeping one resolution rule across the whole seam rather than two. The accepted
consequence is that a skin's faces and a core pack's specials can appear in the same hand — the
same cross-tier mixing `assetFace` already permits per id.

`assetSpecialFrame` reads `specials[type].frame` from the skin tier if present, else the core
tier, else `true`.

**Callers combine the two resolvers — for face keys only:**

```js
assetSpecial('dyb', type, faceValue) || assetFace('dyb', faceValue)
```

This is what makes a `specials`-less skin do the right thing automatically: its own standard face
art, drawn inside an engine-owned type frame.

**`"blank"` keys must never fall back to `assetFace`.** A missing `specials.phantom.blank` falls
back to the engine `?` glyph, and a missing `specials.cracked.blank` to the `✕` glyph — never to
face art. For phantom this is a **correctness** rule, not a cosmetic one: the concealed die's real
value is passed to `dybDieHTML` as `val`, so an `assetFace(val)` fallback would render the hidden
face and leak it to the owner and to spectators. Cracked has the same shape of bug in a milder
form — a die that always counts 0 would appear to show a value. The fallback chain is therefore
split by key type:

| Key | Chain |
|-----|-------|
| face `1`–`6` | `assetSpecial` → `assetFace` → pip grid |
| `"blank"` | `assetSpecial` → engine glyph. **No `assetFace` step.** |

## 5. The frame contract

The engine's type chrome (border + tint + glow) draws around skinned special art by default.
`"frame": false` suppresses it — **but only for a die whose special art actually resolved.**

If the die fell back to `assetFace` or to the pip grid, the frame draws regardless of the opt-out.
Without this rule a pack that sets `frame: false` and then omits face 5 would ship an
indistinguishable standard-looking die — precisely the failure the opt-out is scoped to avoid.
Implementation is a provenance check, not a second config key:

```js
const specialUrl   = assetSpecial('dyb', artType, artKey);      // null if not covered
const suppressFrame = !!specialUrl && assetSpecialFrame('dyb', artType) === false;
```

**Two things stay engine-owned unconditionally:**

- **`.dyb-die-phantom-ring`.** A compound phantom at the Overlook keeps its indigo ring even when
  the *secondary* type opted out. The ring is phantom's identity, not the secondary's, and an
  opt-out belongs only to the type that declared it. This requires splitting the ring out of
  `extraCls` into its own `ringCls` variable — today they are concatenated in the same string,
  so suppressing one would suppress the other.
- **The unassigned-Slick glyph `4*`.** Not skinnable. The digit is the live auto-rolled face and
  the `*` marks the die as tappable; replacing it with a static image destroys information the
  player needs in order to choose. `specials.slick` covers *assigned* Slick faces only.

## 6. Render restructure — `dybDieHTML`

The `switch (type)` block is **unchanged**. It remains the single source of every type's colour
identity, and nothing about the pip-grid or glyph output changes. Three things happen around it.

### 6a. The switch additionally records which `specials` entry the die wants

| Die state | `artType` | `artKey` |
|---|---|---|
| `standard` | — | `assetFace` only, as today |
| `loaded` / `snake` | that type | `val` |
| `slick`, assigned | `slick` | `slickFace` |
| `slick`, unassigned | — | none — engine glyph (§ 5) |
| `phantom`, in hand (`dieIdx >= 0`) / spectator (`dieIdx === -2`) | `phantom` | `'blank'` |
| `phantom`, revealed pure (`dieIdx === -1`, no secondary) | `phantom` | `val` |
| `phantom`, revealed compound | the **secondary** type | that type's own key, per the rows above |
| `cracked` | `cracked` | `'blank'` |

Compound phantom therefore resolves through the secondary type's art and receives `ringCls` on
top. Spelling out the four secondary cases, since "that type's own key" is doing real work here:

| Compound | Resolves | Fallback face if uncovered |
|----------|----------|----------------------------|
| phantom + loaded | `specials.loaded[val]` | `assetFace(val)` |
| phantom + snake | `specials.snake[val]` | `assetFace(val)` |
| phantom + slick | `specials.slick[slickFace]` | `assetFace(slickFace)` |
| phantom + cracked | `specials.cracked.blank` | engine `✕` glyph — **no face fallback** (§ 4) |

The slick row is why the existing `if (slickFace > 0) val = slickFace;` reassignment inside the
compound branch must stay: it is what makes both the art key and the fallback face the *assigned*
face rather than the underlying roll.

### 6b. The art check moves above the `textLabel` early-return

Today `textLabel !== null` returns immediately, before the asset hook. That ordering is why
`blank` art could never reach the screen. New order:

1. resolve art → 2. framed asset die, **or** 3. glyph (`textLabel`), **or** 4. pip grid.

### 6c. New DOM for a framed asset die

```html
<div class="dyb-die {borderCls} {bgCls} {extraCls} {ringCls} dyb-die-framed select-none">
  <span class="dyb-die-art" style="background-image:url('…')"></span>
</div>
```

```css
.dyb-die.dyb-die-framed { display: block; padding: 3px; }
.dyb-die-art {
  display: block; width: 100%; height: 100%; border-radius: 6px;
  background-size: cover; background-position: center; background-repeat: no-repeat;
}
```

The existing edge-to-edge `.dyb-die-asset` is **untouched** and still serves three cases:
standard faces, the cup back (`dybDieBackHTML`), and opted-out specials. The shipped
standard-face path therefore carries zero regression risk.

`.dyb-die-framed` never co-occurs with `.dyb-die-sm` / `.dyb-die-xs` — those come only from
`dybDieHTMLSm` / `dybDieHTMLXs`, which always pass `type: 'standard'`. Their `padding` overrides
cannot conflict. Both helpers rewrite the class string via `.replace('class="dyb-die ', …)`,
which the markup above still satisfies.

### 6d. Signature cleanup

`dybDieHTML`'s 4th parameter `visible` is dead — declared at `dyb.js:1390`, never referenced in
the body, and passed `true` by all six call sites. Drop it:

```js
// before
dybDieHTML(val, type, slickFace, visible, dieIdx = -1, isSlickAssigned = true, phantomSecondary = null)
// after
dybDieHTML(val, type, slickFace, dieIdx = -1, isSlickAssigned = true, phantomSecondary = null)
```

All six call sites are positional and must be updated in the same change:
`dyb.js:1025`, `:1141`, `:1219`, `:1350`, `:1489` (`dybDieHTMLSm`), `:1492` (`dybDieHTMLXs`).

## 7. Verification — `tools/verify-dyb-dice.js`

`dybDieHTML` is a **pure string builder**: no DOM reads, no game state, no side effects. A
headless harness is therefore cheap, and after this change the function carries roughly fifteen
branches — enough to justify one, matching the house pattern set by `tools/verify-pko-*.js`.

The harness stubs `assetFace` / `assetSpecial` / `assetSpecialFrame` and asserts the emitted
string carries the right classes and omits the wrong ones across:

- **5 types × 3 art states** (special art present · absent · present with `frame: false`)
- **3 view contexts** — in hand (`dieIdx >= 0`), Overlook (`-1`), spectator (`-2`)
- **Compound phantom** — every secondary type resolves through the secondary's art, and
  `.dyb-die-phantom-ring` survives a secondary `frame: false`
- **The § 5 safety rule** — `frame: false` **plus** a missing face ⇒ the frame still draws
- **The § 4 leak guard** — a pack with `specials.phantom` face art but **no** `blank` renders the
  `?` glyph, and the emitted string contains no image URL and no digit. This is the assertion that
  fails loudly if anyone later "simplifies" the two fallback chains into one
- **Regression guards** — a `specials`-less pack emits exactly today's output for standard faces;
  unassigned Slick always emits the `4*` glyph, never art

Manual pass on top: Tempest ON, launch `deep-ocean-dice`, play a full Shake through the Overlook;
then `sea-cliff-dice` to confirm the faces-only fallback (standard art + engine-framed specials).

## 8. Demo / reference art

`deep-ocean-dice` is SVG, so its special dice are hand-authorable in-repo with no image pipeline.
It gains a `specials` block exercising **every** new key — per-type faces, `blank`, and one
`frame: false` — so the schema has a live working reference, which is what
`expansion-guide.md` already promises the bundled packs are.

`sea-cliff-dice` (PNG) deliberately stays faces-only: it is the fallback path's live test.

Note for whoever edits `CLAUDE.md`: it currently names a `neon-dice` sample pack. No such folder
exists — the two live DYB skins are `sea-cliff-dice` and `deep-ocean-dice`. Correct it while
updating the SW version.

## 9. Files touched

| File | Change |
|------|--------|
| `js/lib/art.js` | `assetSpecial`, `assetSpecialFrame`; header comment updated |
| `js/games/dyb.js` | `dybDieHTML` restructure (§ 6) + 6 call-site signature updates |
| `css/styles.css` | `.dyb-die-framed`, `.dyb-die-art` |
| `data/packs/deep-ocean-dice/` | `specials` block + hand-authored SVG special dice |
| `tools/verify-dyb-dice.js` | new headless harness |
| `sw.js` | `CACHE_NAME` bump — `art.js` / `dyb.js` / `styles.css` are precached |

`data/art/` is **not** touched (§ 2). `index.html` is **not** touched — no markup change is
required, which also keeps this clear of the known `index.html` UTF-8 mojibake hazard.

## 10. Documentation closure (Documentation Integrity Protocol)

1. `docs/expansion-guide.md` — the `specials` block: authoring steps, the three key shapes, the
   frame contract, and a DYB row in the `faces` id cheat-sheet replacing the current
   "standard dice only — special Tempest dice keep their pip styling" caveat
2. `docs/code-map.md` — `assetSpecial` / `assetSpecialFrame`; the reworked `dybDieHTML` seam
3. `docs/rules/game-identities.md` § Game 10 — special dice are skinnable; `specials` key names
4. `docs/implementation-notes/dyb-implementation-notes.md` — design decisions: why the frame is
   engine-owned, why the opt-out is provenance-gated, why unassigned Slick stays a glyph
5. `docs/decision-log.md` — one line: shared asset manifest gains `specials` (architectural)
6. `docs/deferred-work.md` — nothing to close (the limitation was never logged there; verify with
   a grep and, if an entry has since appeared, mark it Closed rather than deleting it)
7. `CLAUDE.md` — SW version, current focus, and the stale `neon-dice` reference (§ 8)

## 11. Decisions taken

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Optional `specials` block, per-type, with fallback to the standard face | A skin that ignores it still looks coherent; existing packs unaffected |
| D2 | Frame opt-out allowed per type (`frame: false`) | Lets a skin whose art already reads as "loaded" avoid a double border |
| D3 | Opt-out is provenance-gated | A pack cannot accidentally ship indistinguishable dice via a missing face |
| D4 | Reserved `"blank"` key for faceless dice | `cracked` is otherwise permanently unskinnable; `"blank"` is honest for both cracked and phantom, unlike `"hidden"` |
| D5 | Unassigned Slick not skinnable | Its `4*` glyph carries the live auto-rolled face — information, not decoration |
| D6 | Phantom ring always draws | The ring is phantom's identity; an opt-out belongs only to the type that declared it |
| D7 | `.dyb-die-asset` kept, `.dyb-die-framed` added | Zero regression risk on the shipped standard-face path |
| D8 | No DYB core art in this change | Dice need an alpha PNG pipeline run; would block a schema decision behind an art task |
| D9 | Headless harness built | `dybDieHTML` is pure, the branch count is ~15, and it matches the `verify-pko-*` house pattern |
| D10 | `"blank"` keys never fall back to `assetFace` | A face fallback on `phantom.blank` would render the concealed die's real value and leak it to its owner and to spectators |
