# The Cost Envelope — what this project may spend, and on what

**Status: PROPOSAL, 15 Sep 2026.** Written for the lobby redesign, but deliberately general —
it governs any feature, not just this one. Supersedes nothing; it *organises* rules that are
currently scattered across `CLAUDE.md` § Anti-Patterns, `logic-engine.md` § PWA Guardian and
`ui-style.md` § Motion Standard, and adds the thing none of them carry: **numbers**.

---

## 1. Why this exists

The old framing was a list of prohibitions — no build step, no external libraries, no backend,
zero cost. That framing did its job for eighteen months and is now producing bad answers,
because the project has already, deliberately, walked through several of those doors: Three.js
is vendored and shipping, Firebase runs every multiplayer room, six games carry bitmap artwork,
and the Workshop renders a 3D object with painted textures.

A prohibition list can only say *no*. What the project actually needs is a way to say
**"yes, and here is what it costs"** — which is what you would hand a designer at a studio.

This document replaces the binary with three tiers and a price list.

---

## 2. The distinction that matters most

"Our constraints" currently contains two unrelated things. Keeping them in one box makes it
sound as though relaxing the second means relaxing the first. It does not.

### 2a. Craft constraints — permanent, tier-independent, never traded

These are not a ceiling on ambition. They are what makes ambitious work feel *good* rather
than janky, and they become **more** important as the project gets shinier, not less. A 3D
cabinet that drops frames because something animates `width` is worse than no cabinet at all.

| Constraint | Where it lives |
|---|---|
| 44 px minimum touch target | `ui-style.md` § Thumb-Friendly UI |
| Animate `transform` and `opacity` only | `ui-style.md` § Motion Standard |
| `prefers-reduced-motion` honoured — including **JS/RAF animation, which must check itself** | `ui-style.md` § Motion Standard |
| Every failure path silent on a game screen — never a thrown error in front of a player | `logic-engine.md` § PWA Guardian |
| The Stack as the canonical screen layout | `ui-style.md` § The Stack |
| No horizontal page scroll at 390 px | `ui-style.md` § The Stack |
| Australian English, metric units | `ui-style.md` § Sylly Tone |

**These are out of scope for negotiation at every tier below.** A Tier 3 feature with a
server behind it still animates `transform` only.

### 2b. Business and architecture constraints — genuinely strategic, genuinely up for review

Zero hosting cost · no backend · no build step · install size · dependency count.

These are the ones the project has outgrown in places, and the ones §§ 4–6 price rather than
prohibit.

---

## 3. Where the install actually stands (measured 15 Sep 2026, SW v230)

**Total precached install: 11.49 MB** across 191 entries.

| Bucket | Size | Note |
|---|---|---|
| `data/art/` — core art | **6.03 MB** | Six games of twenty. **Over half the install.** |
| `js/games/` — 20 plugins | 1.98 MB | The actual games |
| `js/lib/` | 1.50 MB | Three.js ~0.60 MB, Firebase ×4, Tailwind, physics, cards, sticker surface |
| `index.html` | 0.73 MB | Single page, all 20 games |
| `assets/logo.png` | 0.47 MB | **One PNG. 4% of the install.** |
| `js/` engine + controller + secret-mode | 0.41 MB | |
| `data/` word banks and game data | 0.21 MB | |
| `css/styles.css` | 0.13 MB | |
| `fonts/` — Fredoka ×2 woff2 | **0.03 MB** | Trivially cheap |

Three findings that should change how we argue about cost:

1. **Bitmap art is the only real cost centre.** Six games account for 6 MB. If the remaining
   fourteen convert at the same average the install passes 20 MB; at COMB's rate
   (**3.76 MB for one game** — the outlier) it would pass 50 MB.
2. **Code-driven visual richness is nearly free and already paid for.** Three.js, canvas, SVG
   and CSS together are a fraction of one game's artwork. Ambition expressed in *code* costs
   almost nothing; ambition expressed in *pixels* costs everything.
3. **The font is not the expensive part.** Fredoka is 33 KB. The cost of replacing it is the
   suite-wide restyle across 20 games — a labour cost, not a byte cost. Earlier framing in this
   conversation said otherwise; the measurement corrects it.

---

## 4. The three tiers

### Tier 1 — already paid for · **encouraged, no approval needed**

Anything built from what is already installed. Zero marginal cost to the user's device.

- **Three.js** (vendored, precached, shipping since SW v228) — 3D objects, materials, painted
  textures, animation. The Workshop already proves the suite carries this fine.
- **Canvas 2D** (`canvas-draw.js`, CLD's physics render, COMB's board)
- **Inline SVG** — unlimited, compresses well, scales, themeable
- **CSS** — gradients, masks, filters, transforms, `@keyframes`, container queries
- **The existing render seams** (`assetFace`/`assetBack`/`assetExtra`, `js/lib/art.js`)
- **Fredoka**, the 20 brand hexes, the existing component vocabulary

**This is where "small wins" live, and the tier a designer should be pushed toward first.**
A richer lobby built from CSS, SVG and the Three.js already on disk is free.

### Tier 2 — costs something · **propose with the number, we decide**

Allowed, but never silently. A Tier 2 proposal must state: what it adds to the install, which
caching contract it takes (§ 5), and whether the cost is one-time or per-game.

| Thing | Real cost | Precedent |
|---|---|---|
| New self-hosted font | ~30–100 KB **plus a 20-game restyle** — the labour is the cost | Fredoka is 33 KB |
| Lobby tile artwork, 20 games | 0.8 MB at a 40 KB/tile ceiling; multiple MB if uncapped | PKO's card art arrived as **26 MB of PNGs** and was re-cut to 682 KB at 40 KB/card |
| A new small library | Its own size, vendored, precached, forever | Three.js 0.60 MB, Firebase ×4 |
| A background music track | ~1.5 MB ceiling, runtime-cached, not in install | `logic-engine.md` § Background music |
| Converting a game to core art | 0.2–3.8 MB **each** | The six existing packs |

**The standing rule, learned the hard way: agree the per-file ceiling *before* the asset is
generated, not after.** That is PKO TG-02 and it is the single most expensive lesson in the
project's history.

### Tier 3 — changes what the project is · **out of scope to build; the seam is mandatory**

Anything requiring a server, an account, or persistent state that survives the device:

- Real user profiles (beyond a local nickname)
- Cloud-saved achievements, stickerbooks, unlocks
- Purchases, entitlements, anything monetised
- Cross-device sync of anything that is not a live game room

**Not to be built as part of a design round, and not a design model's decision.** But per § 7,
the owner's stated direction is that persistent accounts *are* coming — so the seam is no
longer insurance against a possibility, it is preparation for a plan. Any surface that will
one day need it must be designed **as if it is coming**, which costs almost nothing today:

> **Design local-now / server-later as a data-source swap, not a redesign.** Put the reads and
> writes behind one small module with a local implementation, and say in the handoff exactly
> where that seam sits.

**An honest correction while we are here: "no backend" is already not literally true.**
Firebase Realtime Database runs every multiplayer room, and `firebase-auth` already issues this
device an anonymous UID (`syllyDeviceUid`) on first room action — held in memory only, by
deliberate choice. The distance from here to a real profile is therefore *much* shorter than
"we have no backend" implies: the account primitive exists and is already installed. What is
missing is a decision, not an architecture.

---

## 5. The lever nobody uses deliberately: which caching contract an asset takes

This is the highest-leverage and least-understood control in the project, and it can move an
asset between tiers on its own.

| Contract | Behaviour | Cost to install | Adding one |
|---|---|---|---|
| **Precached** (`PRECACHE_URLS` in `sw.js`) | Guaranteed present on a cold offline install | **Full size, for every user, forever** | Edit `sw.js` + bump `CACHE_NAME` |
| **Runtime-cached** (`data/packs/`, `data/music/`, `data/stickers/`) | JSON network-first, images cache-first; fetched on first use, free thereafter | **Zero** | Drop a folder, add a manifest line. No `sw.js` edit, no version bump |

**Recommendation for lobby tile art specifically: put it on the runtime-cached contract, not
the core-art one.** Twenty tiles then cost nothing in install, need no version bump to add or
change, and can be swapped per skin. The trade is that a cold offline first-run shows the
placeholder instead of the artwork —

— **which is exactly why the placeholder must be designed as a first-class treatment rather
than a stand-in.** These two decisions hold each other up. A lobby whose placeholder already
looks finished can afford to treat real artwork as an *upgrade*; a lobby whose placeholder
looks unfinished is hostage to an art project that has not been commissioned.

---

## 6. How to use this

**Designing a feature:** start in Tier 1 and stay there unless the idea genuinely cannot be
expressed in code. Reach into Tier 2 with a number attached. Treat Tier 3 as a seam to leave,
never a thing to build.

**Reviewing a proposal:** ask which tier, and for Tier 2, ask for the byte cost and the caching
contract. "It's just one image" is how a 26 MB precache happens.

**Adding an asset:** agree the per-file ceiling before it is generated. Measure the quality that
ceiling forces at the element's real render size, not in the abstract (`logic-engine.md`'s note
on CJAR TG-02b).

---

## 7. Strategic direction — answered by the owner, 15 Sep 2026

These four were left open in the first draft. Three now have answers. They are recorded as
**direction, not commitment** — none is a decision to build anything, and no design round
should block on them.

**Hobby or monetised? — heading toward monetised.** It began as a hobby project and parts of it
still are, but the accumulated effort makes eventual monetisation the sensible direction. Treat
this as the working assumption, not a plan with a date.

**Are art and skins the product? — no. The games are.** The product is the games and the
entertainment they produce; the longer-term ambition is the *Little Sylly brand* itself, beyond
this box. **This is the answer that settles the tiers: bitmap art stays a cost centre, not a
storefront.** It is why § 5's runtime-cached recommendation holds — art should be cheap to add,
cheap to change, and never a tax on install.

> **The tension to watch.** The retention layer described below — achievements, sticker
> collecting, personalising your controller — is historically the *exact* surface that becomes
> cosmetic monetisation. That does not contradict "the games are the product", but it does mean
> the stickerbook is the most likely thing here to turn into a storefront later. The practical
> consequence is already satisfied: `data/stickers/` is **already** on the runtime-cached
> contract (SW v229), which is precisely the contract a storefront needs — content added without
> shipping an app version. No change required; just do not migrate it to precache.

**Persistent accounts? — yes, expected.** Monetisation would require them, and independently the
owner wants a layer of fun outside the games: completing achievements, collecting stickers,
personalising an account. **The controller is envisioned as doubling as the player avatar.** How
far this goes depends on whether the project finds an audience. Architecturally the gap is small
(§ 4, Tier 3 — the anonymous-UID primitive is already installed).

**Is a build step worth it? — decided in 2026, deferred with a trigger, and THE TRIGGER HAS NOW
FIRED.**

`docs/decision-log.md` 2026-06-30 ("No-build constraint reviewed; dev-only assembly build
deferred") kept every constraint and deferred — explicitly *not* rejected — the **dev-only
assembly build** (per-game HTML partials concatenated into the shipped `index.html` by a Node
script outside the runtime; register Lever A). Its reasoning still holds: `$0` and *no build* are
independent, so the build's only payoff is this file's token pain, which discipline was
mitigating; and a build adds **owner-facing fragility** — a non-coder owner stuck at 11 pm behind
a broken build. That objection is the load-bearing one.

The revisit trigger was **`index.html` crossing ~750 KB / ~20 games, whichever came first.**

| Condition | Trigger | Measured 15 Sep 2026 |
|---|---|---|
| `index.html` size | ~750 KB | **763,121 bytes** — 745 KiB, 763 KB decimal. At the line on either reading |
| Game count | ~20 games | **20.** Met exactly |

**Both conditions are now at or past the line.** Per that entry the next step is to *spec it as
its own task* — not to adopt it reflexively. Two things have changed since, and both belong in
that spec:

1. **A third option exists that the 2026 decision never weighed.** It considered only *keep the
   monolith* versus *adopt a build*. But each `js/games/[abbr].js` already owns its game's state,
   logic, screens, packets and teardown — it could own its **markup** too, injected at runtime
   from a template string or a precached `<template>` partial. That is **not a build step**:
   nothing to break at 11 pm, no npm, no stale artefact, no GitHub Pages change. It dodges
   precisely the fragility objection that deferred Lever A, while delivering the editability
   Lever A was wanted for.
   **It is not a free win.** `js/engine.js` calls `getElementById` at parse time (the boot block,
   `_lobbySortBtn`), so partials must be in the DOM *before* plugin scripts run — a real
   boot-ordering problem needing either synchronous injection or an async boot gate. Promising,
   genuinely novel here, and not trivial.
2. **The lobby redesign pushes the file further.** Four switchable layouts will be the first time
   the engine/global section itself grows substantially, rather than a game's section.

**This does not block the lobby redesign** and should not be folded into it. It is its own task,
now due rather than pending.

---

## 8. What changes if this is approved

1. `CLAUDE.md` § Anti-Patterns gains a pointer here — the prohibitions stay accurate as
   *defaults*, with this document as the escape procedure.
2. `docs/decision-log.md` gains one entry.
3. The lobby redesign brief quotes §§ 2a, 4 and 5 directly as Fable's working envelope.
