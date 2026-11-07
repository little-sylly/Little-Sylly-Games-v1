# UI reference — screen patterns

> On-demand (not auto-loaded). Round/Night intro, Team Setup, legacy sticky-footer + whitelist, Vocab Lock. Moved from `.claude/rules/ui-style.md`. Moved verbatim on 4 Nov 2026; each source file keeps a stub with the headline rule.

---

## Round/Night Intro Screen (default for the start of every match round)

**Every game where the same phase (a Night, a Raid, a Round) repeats several times per match should
show a short, auto-advancing intro screen at the start of each repetition — not jump the player
straight from "deal" into an already-live table.** This is the interstitial exception (rule 5 above)
used as a *beat*, not just a result flash. References: `screen-cjar-raid-intro`, `screen-shp-night-intro`.

**Job of the screen — flavour AND orientation, not just flavour.** In one or two short lines: set
the scene in the game's voice, and restate lightly (not a rules dump) what the player is about to do
or watch for. SHP's *"Don't go over 99 or you might really just fall asleep"* is both in one
sentence. A pure mood line with no practical content wastes the same five seconds.

**Shape:**
```html
<section id="screen-[abbr]-[phase]-intro" style="display:none"
  class="flex items-center justify-center w-full min-h-screen px-5 py-8 overflow-y-auto">
  <div class="flex flex-col w-full max-w-sm gap-4 text-center">
    <div class="text-6xl" role="img" aria-label="...">[emoji]</div>
    <h2 id="[abbr]-intro-heading" class="text-3xl font-bold text-stone-800"></h2>
    <p id="[abbr]-intro-sub" class="text-stone-500 text-base"></p>
    <!-- optional third element: a Sylly-Mode-only note, a per-player private hint (CJAR's
         Favourite/Watcher box), anything conditional — style="display:none" until populated -->
  </div>
</section>
```
No `[?]`/🔊/✕ — the rule-5 interstitial exemption applies (nothing is tappable for the ~5 s it's up).
Emoji should differ from the game's main menu emoji where reasonable, so the intro reads as its own
beat rather than a repeat of the menu (SHP uses 🌙 for "Night begins", distinct from the menu's 🐑).

**Rotate the flavour line if the phase repeats many times a match** — the same sentence every time
reads as filler by the third showing. Keep a small array (`SHP_NIGHT_FLAVOUR`, 4–6 lines) and pick
one per repetition, **host-picked and synced** in MDLM (ride the index in whatever SYNC packet
already carries the deal). Picked independently per device, players sitting together see different
text for the same moment.

**Wire it in at the SAME point on host and client** — called from **both** the host's deal path and
the client's `SYNC` applier for that deal (SHP: `shpDealNight()` and the `SHP_DEAL` applier). Miss
either half and one class of device skips straight past the intro. Auto-advance via `setTimeout` to
the real table-show function, clearing any prior handle first (a rapid redeal must never stack two
pending timers) and clearing it in teardown per § Timer Lifecycle (`logic-engine.md`).

**Not yet retrofitted** beyond CJAR/SHP — suite sweep tracked in `docs/deferred-work.md`.

---

### Legacy sticky-footer pattern — do NOT use for new screens

Some older screens use `h-screen overflow-hidden` with a `flex-1 overflow-y-auto min-h-0` Stage between `flex-shrink-0` Header/Controls. **Deprecated for new work** — it is the single largest source of "not together, not centred" screens, because a screen can be technically correct (button visible, content reachable) while looking sparse and edge-pinned. New games use the Stack for *every* screen. Migrate existing ones opportunistically; log each migration in the game's impl notes.

If you think a screen *needs* it, you almost certainly don't: the only real trigger is a Stage that must scroll **independently** while the Controls stay frozen, and the project decision (June 2026) prefers whole-Stack scrolling even for long card hands.

---

### Legacy `h-screen` whitelist (baseline sweep, 26 June 2026)

These are the **only** remaining legacy sticky-footer screens — each a deliberate exception. If one of these looks sparse/edge-pinned that's expected; if any **other** screen does, it's a new bug.

| Screen(s) | Why it keeps the sticky footer |
|-----------|-------------------------------|
| `screen-gth-canvas` | Freehand drawing surface — the canvas must **not** scroll while drawing (a page-scroll would hijack the stroke). Fixed Stage is mandatory. |
| `screen-gth-case` | Rendered drawing + answer cards + live countdown — fixed Stage with the diagnosis action always visible. |
| `screen-dsd-captain`, `screen-dsd-crew`, `screen-dsd-execution`, `screen-dsd-sabotage`, `screen-dsd-spectator` | 5×5 grid + legend with an always-visible Sonar/sequence/disarm CTA while tapping tiles. |
| `screen-cld-floe` | Drag-to-aim canvas — a page-scroll during a drag would hijack the aim. Power bar, commit tally and Lock It In must stay fixed beneath a stage the player is dragging on. |
| `screen-nt-allocation` | DNP captain huddle — cluster bridge + rebalance controls + Lock CTA + huddle timer; controls must stay put while scanning legs. |
| `screen-comb-meadow` | Fit-to-view board the player taps to place on. The hand row and action bar must stay put while the board is read, and no page-scroll may carry a legal target off screen. Zoom lives in `comb-map-overlay`, not here. |
| `screen-lounge`, `screen-tv`, `screen-jukebox`, `screen-arcade` | The lobby's full-window stages (SW v231; the jukebox SW v233 — its cat is drag-to-turn, and below 860 px the screen scrolls itself as one column). A page-scroll would hijack a drag in the Lounge's room; TV is a fixed rail + pane layout. `screen-shelves` scrolls as a column and is not an exception. |
| `screen-workshop` | The 3D controller stage — since SW v234 a full room like the jukebox (`css/workshop.css`: paint \| stage \| stickers, no tabs). A page-scroll during a rotate-drag would hijack the drag (the same ground as `screen-cld-floe`), and the preview must stay visible while colours and stickers are picked — the choice depends on what the Stage is showing. Below 1100 px the room scrolls itself with the stage **pinned** (sticky) on top, for the same reason. |
| `screen-mp-mode`, `screen-mp-lobby-host`, `screen-mp-lobby-join`, `screen-mp-roster` | Shared multiplayer infrastructure (all 4 MDLM games) — roster lists with a frozen primary CTA. High blast radius; migrate only if visibly broken. |

Every other content/results screen in the suite has already been migrated to the Stack — a few carry a residual nested wrapper or uneven per-zone padding from the scoped class-transform used to do it; polish opportunistically, don't re-sweep.

---

## Team Setup Screen Standard
**Applies to:** Any game where two teams compete (2-team games only). Single-player or co-op games skip this.

### Screen count
- **Single-screen** (team names only, no individual player tracking): Screen 1 only. Example: LI5.
- **Two-screen** (team names + individual player names / captain assignment): both screens. Example: SS, DSD.

---

### Screen 1 — Team Names (`screen-[abbr]-setup`)

**Section class:**
```
relative flex flex-col items-center justify-center px-6 py-12 w-full max-w-sm mx-auto text-center gap-6
```

**Required structure:**
```
[absolute top-4 right-4 flex items-center gap-2: btn-open-sound 🔊 + ✕ exit button]
[div.text-5xl role="img": game emoji]
[div: h2.text-3xl.font-bold.text-stone-800 + p.text-stone-400.text-base.mt-1 hint]
[div.flex.flex-col.gap-4.w-full.text-left:
  [div: label + input]
  [div: label + input]
]
[CTA button]
```

**Label style:** `text-stone-500 text-sm font-semibold uppercase tracking-widest block mb-1`
Label text is game-specific ("Team 1", "Team A name", etc.) — structure matters, not exact wording.

**Input style:**
```
w-full rounded-xl border-2 border-stone-200 bg-white px-4 py-3 text-lg text-stone-800
placeholder-stone-300 focus:border-[brand-colour] focus:outline-none transition-colors
```

**Rules:**
- No card wrapper around the inputs — bare `div.flex.flex-col.gap-4` only
- Hint subtext MUST name the actual defaults — e.g. "Leave blank to use Alpha Echo & Bravo Zulu"
- Placeholder text = the default name (e.g. `placeholder="e.g. Crayon Crew"`)
- No team size pills on this screen
- **Pre-fill rule:** only pre-fill if the user previously set a *custom* name — leave blank (show placeholder) if the value is still the default. Check: `value = teamNames[0] !== 'DefaultA' ? teamNames[0] : ''`

---

### Screen 2 — Player Names (`screen-[abbr]-players`)
**Only for games with individual player name inputs.** Omit entirely for games like LI5 that don't track per-player names.

**Section class:**
```
relative flex flex-col items-start px-6 py-10 w-full max-w-sm mx-auto gap-5
```

**Required structure:**
```
[div.flex.justify-between.items-center.w-full: ← back / eyebrow label / btn-open-sound 🔊]
[div: h2.text-2xl.font-bold.text-stone-800 heading + p.text-stone-400.text-sm.mt-1 subtitle]
[div.w-full: "Team size" label + pills — NO card wrapper]
[div.w-full: team-A coloured label + input container]
[div.w-full: team-B coloured label + input container]
[p error text — hidden by default]
[CTA button]
```

**Team size label style:** `text-stone-600 text-sm font-semibold mb-2` (no card wrapper)
**Team label style:** `text-xs font-semibold uppercase tracking-widest text-[brand-colour] mb-2`
**Player input style:** same as Screen 1 input style above (use `text-base` instead of `text-lg`)

**Rule:** Team size pills belong on Screen 2 — NOT on Screen 1.

---

### Per-game reference
| Game | Screen 1 heading | Default names | Input focus colour | Screen 2? |
|------|-----------------|--------------|-------------------|-----------|
| LI5 | "Name your Playgroups!" | Crayon Crew / Glue Stick Gang | `focus:border-pink-400` | No |
| SS | "Establish Cover Identities" | Alpha Echo / Bravo Zulu | `focus:border-teal-400` | Yes |
| DSD | "Name Your Task Forces" | SS Kraken / SS Leviathan | `focus:border-cyan-600` | Yes |

---

## Vocab Lock Reuse Pattern
The vocab lock is game-agnostic and available to any future game:
- **Vocabulary check:** `window.activeExpansionData.vocab.has(normaliseWord(input))`  — covers primary words AND all `nono_list` terms
- **Open vocab overlay:** `smOpenVocabOverlay()` — opens the terminal-style `#gm-vocab-overlay`
- **"VIEW WORD LIST" button:** show `#gm-vocab-list-btn` reactively on vocab-lock failure; reset (hide) at the start of each turn's input setup
- Any future game can wire a "VIEW WORD LIST" button to `smOpenVocabOverlay()` with zero changes to `secret-mode.js`
