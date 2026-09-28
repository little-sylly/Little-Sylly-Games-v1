# Cold Shoulder — the pool-style cue + the Practice Arena

**Status:** design approved in conversation 28 Sep 2026 · awaiting written-spec review
**Game:** Cold Shoulder (`cld`) · **Builds on:** SW v243 (`0290932`, `cld-implementation-notes` DD-17)
**Ships as:** SW v244 · **`MP_PROTOCOL_VERSION` stays `'v243'`** — no packet changes shape or meaning
**Practice tracker:** `docs/practice-rollout.md` § 6.1 (CLD, P1, Arena) — this spec is its D1 script
**Out of scope — next spec:** the procedural art overhaul. Also not here: the phase-40 live session and
offline install check (owner-run; they can run against v244).

---

## 0. Why

The first live 3-player session (28 Sep 2026) called the drag **clunky**. Today's aim, read from the
code:

- **Grab** only within `CLD_PENGUIN_R × 3.2` of your own penguin — ~20 px at 320 wide.
- **Slingshot**: shot direction is the reverse of the finger's displacement from the penguin.
- **Power** = pull length / `CLD_W × 0.36` (~130 logical ≈ 113 CSS px at 320 wide, varies by phone).
- **Feedback**: a 46-unit pull-back line drawn *behind* the penguin — under the thumb.

The owner asked for a **pool-style** drag, built **together with the Practice Arena** — the Arena is the
drag's test bed, and the drag is what the Arena teaches.

## 1. Owner decisions (28 Sep 2026)

| Question | Decision |
|---|---|
| What "pool-style" means | **Cue from anywhere** — touch anywhere, the finger is the butt of the cue, swing to aim, pull back along the cue for power |
| Aim guide | **Ghost + short deflection stub** — a ghost penguin at first contact, and a fixed-length stub for which way a struck *penguin* is pushed. Direction only, never distance |
| Arena structure | **3 drills, pick one** — Head-on · Crossfire · Edge; each repeats identically |
| The Drowned side in the Arena | **Only if you go in** — a Berth branch, no separate drill |
| Tabs | **The Rules \| Practice \| The Cast** — The Floe tab's sandbox is absorbed by the Arena |
| How the Arena runs the real rules | **The swap (§ 5)** — globals stay; `cldArenaRun(fn)` swaps the Arena's state in for one synchronous call. Chosen over threading a state object through the whole rules layer (too large a diff to v243's core and every harness) and over an Arena-lite copy (the drift D2 forbids) |
| The cue's numbers | **96 px** full pull, finger-is-the-butt direction — "let's try"; both are tunables (§ 9) |
| Commits | v243 committed first (`0290932`), then this spec |

---

## 2. The cue

### 2.1 The gesture

Applies in **Throw/Aim** mode while this device has at least one penguin **Standing**. Snowball taps,
Dive taps and the Peck Off hold are unchanged.

1. **Touch down anywhere on the stage.** The penguin being aimed:
   - the penguin touched, if the touch lands within `CLD_PENGUIN_R × 3.2` of one of *mine* (Peck Off
     uses this to switch);
   - otherwise the **default** penguin: my only Standing penguin, or in Peck Off the first without an
     armed aim, else the last one aimed. Derived, never stored: the pure `cldDefaultPenguin(standing,
     aims)` answers it (planning, 29 Sep 2026 — no `cldSelPenguin` state).
   When there is a choice (Peck Off), the default penguin wears a **soft highlight ring** (drawn by
   the renderer, § 4).
2. **Direction** — the cue runs from the finger through the penguin; the shot goes **away from the
   finger**: `dir = unit(P − F)`. Swinging the finger sideways swings the aim; the further the finger is
   from the penguin, the finer the angle (the lever).
3. **Dead zone** — while `|F − P| < CLD_CUE_DEAD` (2 × `CLD_PENGUIN_R`) the direction holds its last
   value, so it never jitters or flips under the finger.
4. **Power** — how far the finger has pulled back *since touch-down*, measured along the cue, in **CSS
   pixels**: `pull = |F − P| − |F₀ − P|` (logical) × `view.scale`; `power = clamp(pull / CLD_CUE_PULL_PX, 0, 1)`.
   Touch-down is always power 0 — a stray touch can never fire. Pushing back in lowers it. Screen pixels,
   not logical units, so full power is the same thumb travel on every phone.
5. **Power lock** is unchanged in its control (tap the bar) and grows a use: while locked, dragging
   only swings the aim — the "aim, then power" two-step for anyone who wants it.
6. **Release arms** (unchanged). A new drag replaces that penguin's armed aim; below `CLD_MIN_POWER` it
   reads *Too soft* and arms nothing. A touch must also travel `CLD_CUE_TAP_PX` (4 CSS px) before its
   release can arm (planning, 29 Sep 2026) — with the bar locked, power no longer comes from the pull,
   so without this a plain tap would re-aim at the locked power. So a plain tap never changes an armed
   aim. **Lock It In** commits.

**Wire unchanged.** An armed aim is still `{ penguinId, dx, dy, power }` with `(dx, dy)` along the shot;
`cldBuildSlideInputs` normalises it. Nothing on the wire changes, so the loopback's packet assertions
are the proof it didn't.

### 2.2 One pure function

```
cldCueAim({ down, now, penguin, scale, lock, lastDir }) → { dx, dy, power, dir } | null
```

`down`/`now`/`penguin` are logical points; `scale` is the view's CSS px per logical unit; `lock` is
`cldPowerLock`; `lastDir` feeds the dead zone. No globals, no DOM. The live pointer handlers
(`cldPointerDown/Move/Up`) become thin wrappers that feed it; the Arena's handlers call the same function.
`cldCurrentDragAim()` survives as a five-line wrapper that feeds it the live drag state, and a pure
`cldReleaseAim(aim, down, now, scale)` decides what a release arms for both surfaces.

### 2.3 The picture

- **The cue stick** — drawn behind the penguin on the finger's side, along `−dir`. Its tip stands off the
  penguin by `CLD_CUE_GAP_MAX × power`, so the gap **is** the power reading, readable while the thumb is
  elsewhere. Live aim at full opacity; armed-but-not-live aims at the existing reduced opacity.
- **The aim guide** (Aim Assist ON only) — a dotted line forward along `dir` to a **ghost penguin**
  (outline, 50% alpha) at the first contact. The march is today's (`CLD_ASSIST_STEPS` over
  `cldFullSlideDist() × power`); the change is what is drawn at the end:
  - first contact is a **penguin** (Standing): the ghost, plus a **stub** of fixed length
    `CLD_GUIDE_STUB` from the struck penguin along `unit(struck − ghost)` — the pool object-ball line;
  - first contact is a **Berg, a plug or the rim**: the ghost only;
  - no contact within reach: the dotted line ends in today's dot.
- Aim Assist OFF: the cue only.
- The guide stays **one contact deep**. It never predicts beyond the struck penguin's first push, and
  never predicts a Snowball (brief § 14's rule, kept — everyone slides at once, so any deeper prediction
  would be a lie anyway).
- **Pure:** `cldAimGuide(m, aim) → { end, ghost | null, stub | null }` against the render model, so the
  Arena's rival aims use it too.

---

## 3. What stays the same on the floe

Copy (*Tap to lock power*, *Power locked — tap to release*, *Too soft*, *Lock It In*), the Throw · Dive
row, the tally's privacy contract, `screen-cld-floe` on the `h-screen` whitelist, `touch-action: none` on
`#cld-stage`, single-pointer discipline (`cldPtrId`), and the `[?]` greyed during `resolving`/`washout`.

---

## 4. The renderer takes a model (D2)

### 4.1 The view

`cldMakeView(canvas) → { canvas, ctx, scale, offX, offY, x, y, w, h }` replaces the `cldView*` globals.
`cldResize(view)` and `cldToLogical(view, e)` take one. The live floe owns `cldView`; the Arena owns
`cldPrView`. The BUG-14 re-fit (`cldSyncFloeUI` → `cldResize`) is preserved by calling
`cldResize(cldView)` at the same site.

### 4.2 The model

`cldDraw(view, m)` draws **only** from `m` (the caller advances `m.clock`; the renderer takes no `dt`):

| Field | Carries |
|---|---|
| `radius`, `bergs`, `iceBreaker` | floe, ring, crack density |
| `penguins[]` | `{ id, ownerIdx, x, y, state, facing, me, ringDark, dim, selected }` — pose resolved by the builder |
| `aims[]` | `{ penguinId, dx, dy, power, dir, live, rival }` — `rival` draws in the owner's colour at reduced alpha |
| `assist` | Aim Assist on/off |
| `dive` | `null` \| `{ seats[], ghost }` |
| `snowball` | `null` \| `{ x, y }` |
| `clock` | idle sway |

`cldFloeModel()` builds it from the live globals (everything `cldDraw` reads today:
`cldPhase`, `cldDragging`, `cldMy*`, `cldPlaybackT`, `cldClock`, …). `cldArenaModel(s)` builds it from
the Arena record (§ 5). Every penguin pixel still goes through `cldRenderPenguin` — the seam is unchanged.

### 4.3 Retired

`cldHowtoDrawFloe` (the DD-12 backdrop copy), `cldHowtoSeed/Shove/Settle/Loop/Fit/Start/Stop`, the Floe
tab's markup and its two buttons. `cldHowtoBuildCast`/`cldHowtoDrawCast` move under The Cast tab unchanged.

---

## 5. Running the real rules — the swap

### 5.1 The rule

The Arena keeps its own **record** `s` holding a value for every game-state global the rules and replay
layers read or write — Floe-Off state (`cldPenguins`, `cldBergs`, `cldFloeRadius`, `cldSeatSeq`,
`cldInBath`, `cldSlideNo`), Slide state (`cldCommits`, `cldTimeline`, `cldPlaybackT`, the playback
pointers), match state (`cldFish`, `cldMatchStats`, `cldFloeOffNo`), roster (`cldPlayerCount`,
`cldPlayerNames`) and **settings** (`cldIceConditions`, `cldFloeSize`, `cldIceBreaker`, `cldPeckOff`,
`cldSyllyMode`, `cldAimAssist` — the last copied from live so the Arena shows what the game will).

```
function cldArenaRun(fn) {
  const saved = cldSwapOut();        // live values → a plain object
  cldSwapIn(cldPr);                  // Arena record → the globals
  try     { return fn(); }
  finally { cldPr = cldSwapOut(); cldSwapIn(saved); }
}
```

`cldSwapIn`/`cldSwapOut` are explicit, one line per variable (top-level `let` bindings are not on
`window` and cannot be enumerated at runtime).

**Why it is safe:** `fn` is synchronous and JavaScript is single-threaded, so no live RAF frame, Firebase
callback or timer can run while the Arena's values sit in the globals — including with Practice opened
mid-Slide from the floe `[?]`. **This bends DD-12's wording** ("never reads or writes `cldPenguins`")
and keeps its intent (the live match is never disturbed). Recorded as a new impl-notes decision.

### 5.2 What may run inside the swap — and what may not

**May:** the rules layer (`cldStartFloeOff`-style setup via `cldPlaceBergs(rand)`, `cldResolveSlide(seed)`,
`cldApplyPost`) and the new `cldStepPlayback` (§ 5.3). All synchronous, no DOM, no network, no timers.

**May not — ever:** anything that touches screens, the live loop, timers, the network or the live DOM:
`cldBeginPlayback`, `cldEndPlayback`, `cldAdvancePlayback`, `cldShowFloe`, `cldSyncFloeUI`,
`cldHostResolveSlide`, `cldStartIceBathLocal`, `cldShowResult`, `cldFloatBark` (live layer), and any
`mp*`. A comment block above `cldArenaRun` lists them; the harness asserts none is called (§ 7).

### 5.3 Splitting the replay

`cldAdvancePlayback` today interpolates samples, fires events (sfx, barks), plays aftermath beats — and
at the end calls `cldEndPlayback`, which navigates. Split it:

```
cldStepPlayback(dtMs, hooks) → 'playing' | 'done'
  hooks = { sfx(name), bark(), text(str) }
```

- Positions, the event walk and the aftermath walk move into it verbatim; `cldSfx(...)` / `cldFloatBark()`
  inside `cldPlayEvent`/`cldPlayAftermath` go through `hooks`.
- Live: `cldAdvancePlayback(dt)` = `if (cldStepPlayback(dt, CLD_LIVE_HOOKS) === 'done') cldEndPlayback();`
  — behaviour byte-identical; the loopback proves it.
- Arena: `cldArenaRun(() => cldStepPlayback(dt, arenaHooks))`, where `arenaHooks.bark/text` write into
  the Arena's own float layer (`#cld-pr-float`). `cldFloatBark(layerEl)` takes its layer.

---

## 6. The Arena

### 6.1 The tab

`cld-how-to-overlay`: **The Rules | Practice | The Cast** (`data-cld-howto-tab="rules|practice|cast"`).
`cldOpenHowTo(tab)` keeps opening on The Rules by default. No new overlay, no z-index entry.

### 6.2 The pane, top to bottom

1. **Drill pills** — `pill` / `pill-active-cld`: *Head-on · Crossfire · Edge*.
2. **Coach card** — caption (`text-stone-700 text-sm`) + step counter (`n / N`, `text-stone-400 text-xs`);
   a new line scrolls the card into view.
3. **The stage** — `#cld-pr-stage` (relative, `touch-action: none`) holding `#cld-pr-canvas` and the float
   layer `#cld-pr-float`. Square, `width: 100%; max-height: 46vh; aspect-ratio: 1` — the overlay scrolls,
   so the stage must be fully on screen before a drag starts (the coach card scrolls it in).
4. **The real controls, same classes as the floe** — `#cld-pr-drowned-row` (Throw · Dive + amber reason),
   the power bar (`cld-power-track`/`cld-power-fill`, its hint), `#btn-cld-pr-commit` (`cld-cta`,
   **Lock It In** while aiming, **Go again** after a Slide), and a small neutral **Resurface**.
5. **Practice again** sits beside Resurface and appears once step 5 (or B3) has been reached; **Got it**
   closes the overlay from the bottom of the pane at all times — the How-to rule that every tab body
   carries its own close button (planning, 29 Sep 2026).

Soft ring = a `box-shadow` transition class `cld-pr-ring` on the control being taught (never `animation`;
reduced motion already zeroes transitions).

### 6.3 The setup

- Cast: **You** (seat 0), **Sylvia** (seat 1), **Sam** (seat 2) — the suite's Practice cast, in order.
- Settings in the record: Standard floe, Slush, Ice Breaker 2, Thaw off, Peck Off off, 3 players.
- Each drill has a **fixed ring seed** (so its gaps never move) and a **fixed Slide seed** (so a given
  aim always gives the same result).
- **Rival shoves** are fixed `{ dx, dy, power }` per drill, from each rival's position. They are drawn on
  the stage (as `rival` aims, § 4.2) from the moment the drill loads — seeing them coming *is* the drill.
- Rivals never throw or Dive. A Drowned rival does nothing.

### 6.4 The drills

Positions and shoves are **provisional**: tuned at build until the harness proves every claim (§ 7).
The coach never says a claim the harness has not checked.

| Drill | Setup | Stand-still claim | A counter exists that… |
|---|---|---|---|
| **Head-on** | Sylvia shoves straight at you, full power | you go in | …keeps you Standing (meet her, or leave her lane) |
| **Crossfire** | Sylvia shoves at Sam; you sit in her lane | you are hit | …keeps you Standing (get clear, or shove Sam in yourself) |
| **Edge** | you start beside a slip gap; Sam nudges you toward it | you go in **through the gap** | …keeps you Standing (shove inward, or glance off Sam) |

**Each go.** After a Slide the CTA reads **Go again**: the drill resets to its start, **your last aim
stays armed and drawn**, so the next try is an adjustment, not a fresh start. **Resurface** resets at any
time. Picking another drill resets to that drill's start (and clears your aim).

**End-of-Slide outcomes the Arena must handle:** you Standing; you in (→ Berth branch, § 6.5); both
rivals in with you Standing (*Last one dry — that'd be a Fish.*); a **Washout** (everyone in) → *Washout
— everyone's in. Resurface.* The Arena never starts an Ice Bath and never scores.

### 6.5 The coach

**Main line (N = 5).** Each step waits for the player to do the thing.

| # | Coach line | Ring on | Advances when |
|---|---|---|---|
| 1 | Their shoves are drawn in their colours, and they'll do the same thing every time. Touch anywhere and pull back — your finger is the end of the cue. | stage | an aim is armed |
| 2 | The ghost shows where you'll hit first. Tap Power to lock it — then dragging only swings your aim. | power bar | power is locked |
| 3 | Happy? Lock It In. Once it's in, it's in. | Lock It In | the commit |
| 4 | Everyone slides at once. | — | playback ends |
| 5 | *(Standing)* Still dry. Try another counter — or another drill. · *(in)* → Berth branch · *(both rivals in)* Last one dry — that'd be a Fish. · *(Washout)* Washout — everyone's in. Resurface. | Go again | — |

Locking is taught, not required: **Lock It In is never disabled at step 2.** A player who commits
without locking satisfies step 3's gate early, and the counter jumps 2 → 4. No control is ever
disabled to force a step — the ring points, the player chooses.

**Berth branch (N = 3)** — only if you went in. Positions carry on from where the Slide left them; the
rivals repeat their fixed shoves from wherever they now stand. The Throw · Dive row appears (as live).

| # | Coach line | Advances when |
|---|---|---|
| B1 | You're in the Drink — and you've plugged the gap you went through. The next penguin to hit you bounces off. Tap a penguin to aim a Snowball, then Lock It In. | a Snowball is committed |
| B2 | *(knocked back)* Knocked back — so now it's Throw or Dive. Tap Dive, then a dashed gap. · *(still plugged)* Still plugged. Resurface to try the drill again. | a Dive is committed / — |
| B3 | That's the Drink. Resurface to get back on the ice. | — |

**Ending.** Once step 5 (or B3) has been reached, **Practice again** (Head-on, step 1, aim cleared) and
**Got it** (closes the overlay) appear under the coach card. The Arena keeps working after they appear.

### 6.6 The loop, timers and reduced motion

- **`cldPrRaf`** — the Arena's RAF, driving `cldArenaRun(() => cldStepPlayback(...))` then
  `cldDraw(cldPrView, cldArenaModel(cldPr), dt)`. Its own handle; the live `cldRafHandle` is never touched.
- **`cldPracticeStop()`** cancels `cldPrRaf` and clears `cldPr` timers — called on tab-away, on every
  close button of the overlay, and in `cldResetState()` (so `resetToLobby()` covers it). Replaces
  `cldHowtoStop()` at all its sites.
- **Reduced motion, checked in JS** (`matchMedia('(prefers-reduced-motion: reduce)')`): a Slide steps
  straight to `'done'` in one call — final positions, plugs and knock-backs all shown, barks still appear
  (the CSS block handles their fade). Nothing travels; nothing is hidden.
- **No multiplayer** — the Arena never calls `mpSendEnvelope`/`mpSendPrivate`, never branches on
  `syllyMultiplayerMode`.
- **Sound** — `cldSfx` as live (global audio; mute and System Sounds already gate it).

---

## 7. Verification

### 7.1 New — `tools/verify-cld-practice.js` (D7)

Loads `cld.js` + `physics.js` into a `vm` like the other CLD harnesses; accepts `CLD_SRC=`.

1. **The cue** — touch-down is power 0; pull of `CLD_CUE_PULL_PX` at any `scale` is power 1; a pure
   sideways swing keeps power within ε; the dead zone holds `dir`; a lock holds power while `dir` moves;
   `dir` points away from the finger.
2. **The guide** — ghost at first penguin contact with a stub along the centre line of fixed length;
   ghost only on a Berg/plug/rim; stub never longer than `CLD_GUIDE_STUB`.
3. **Each drill's stand-still claim** holds (You in / hit / in through the gap).
4. **Each drill is winnable** — a search over an aim grid (angles × powers) finds ≥ 1 counter leaving
   You Standing.
5. **Determinism** — the same aim twice → byte-identical timeline; the rivals' impulses identical on
   every go and after Resurface.
6. **Both Berth steps reachable** — a scripted go that sends You in reaches B1; a follow-up that gets You
   knocked back reaches the Dive step.
7. **Gates** — the coach does not advance without the action; Go again only after playback.
8. **Nothing sent** — `mpSendEnvelope`/`mpSendPrivate` stubs record zero calls across the whole run.
9. **Isolation** — (a) parse the source for every top-level `let cld\w+`; each is either in
   `cldSwapIn`/`cldSwapOut` or in an explicit not-swapped allow-list (canvas/view handles, RAF/timer
   handles, the Arena's own `cldPr*`) — a new global fails until it is classified; (b) mid-match (live
   `cldPhase === 'resolving'`, a live timeline half played), run 20 Arena Slides and assert every live
   global is byte-identical afterwards; (c) none of the § 5.2 "may not" functions is called inside a swap.

### 7.2 Regression (D8)

`verify-cld-physics` · `verify-cld-loop` · `verify-cld-loopback` (now exercises the model-fed renderer
and the split replay on 3 devices — the proof `cldStepPlayback` is behaviour-identical) · `mutate-cld`
(add mutants for the cue's dead zone and the swap's `finally`) · `verify-mp-configs` ·
`verify-identity-docs` · `verify-build-fresh`.

### 7.3 Layout (D9)

`visual-check` at **320×452 first**, then 375×548 and 375×667: the floe (cue + guide + the power bar and
tally at 320 — the D3 stage review), the Practice pane (the stage fully on screen, controls reachable),
a reduced-motion pass, and Practice opened mid-Slide from the floe `[?]` (the live Slide finishes
correctly on close).

### 7.4 Hardware (D10) — owner

On the iPhone SE: the cue's feel (96 px, the dead zone) in a real Slide, and all three drills down both
the Standing and the Berth branch.

---

## 8. Files and docs

**Code:** `js/games/cld.js` (cue, guide, view, model, replay split, swap, Arena) · `src/screens/cld.html`
(tabs, Practice pane, Floe tab removed) · `css/styles.css` (`#cld-pr-stage`, `.cld-pr-ring`) · `index.html`
(rebuilt) · `sw.js` (`CACHE_NAME` → v244) · `tools/verify-cld-practice.js` (new) · `tools/mutate-cld.js`.

**Docs (D11), in the Documentation Integrity order:**
1. `docs/code-map.md` — the Practice pane IDs, `cldCueAim`, `cldAimGuide`, `cldMakeView`,
   `cldFloeModel`/`cldArenaModel`, `cldStepPlayback`, `cldArenaRun`, `cldPr*`; Floe tab IDs removed.
2. `docs/game-identities/cld.md` — **paired:** T3 Aim bullet (the cue); T7a overlay row (the three tabs);
   T7b: the Floe-tab copy block out, a Practice block in (drill names, the coach lines, Go again,
   Resurface, Practice again, Got it), the How to Play step heading reworded (*"Drag back to aim, like a
   slingshot"* → a cue line); T9's Floe-tab paragraph → The Cast + Practice. Then
   `node tools/verify-identity-docs.js`.
3. `CLAUDE.md` — the SW v244 entry (v243 moves verbatim to `docs/sw-changelog.md`); the CLD harness row
   gains `verify-cld-practice.js`.
4. `ui-style.md` — § Practice tab: the Arena's reference is now CLD (one line); § How-to tab bar: CLD's
   "The Floe" live-sim exception becomes the Practice tab (the sanctioned exception text is retired, not
   extended).
5. `cld-implementation-notes.md` — DD-18: the cue, the swap (and the DD-12 wording it bends), the replay
   split; lessons.
6. `docs/deferred-work.md` — grep `cld`, `Floe tab`, `RAF animations`, `drag`; the "drag clunky" feel note
   and the RAF/reduced-motion item for the floe sim resolve here.
7. `docs/decision-log.md` — one entry (the swap is a new pattern for Practice on a globals-bound game).

Plus `docs/practice-rollout.md` — the CLD row and its D-items.

---

## 9. Tunables (start values — owner may move them after the hardware pass)

| Constant | Start | Meaning |
|---|---|---|
| `CLD_CUE_PULL_PX` | 96 | CSS px of pull-back for full power |
| `CLD_CUE_DEAD` | `2 × CLD_PENGUIN_R` | finger-to-penguin distance inside which the aim holds |
| `CLD_CUE_LEN` | 58 | cue stick length, logical units |
| `CLD_CUE_GAP_MAX` | 22 | tip-to-penguin stand-off at full power, logical units |
| `CLD_GUIDE_STUB` | 30 | deflection stub length, logical units (~1.25 diameters) |

Drill positions/shoves/seeds live in one table `CLD_PR_DRILLS` beside the Arena code.

## 10. Risks

- **A global added later that the swap misses** → § 7.1 check 9(a) fails until it is classified.
- **A future edit makes something inside the swap asynchronous** (an `await`, a `setTimeout`) → the
  comment block above `cldArenaRun` names the rule; check 9(c) catches the known offenders; mutation adds
  a "finally removed" mutant.
- **The cue feels wrong on hardware** — every number in § 9 is one constant; the gesture's *shape*
  (anywhere, finger-is-the-butt) is the owner's call and stays.
- **Players game the stub** — it is fixed-length and one push deep; everyone moves at once, so it is a
  hint, not a solution (same stance as today's first-contact dot).
