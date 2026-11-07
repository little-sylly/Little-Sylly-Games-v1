# UI reference — Motion Standard

> On-demand (not auto-loaded). Timing, easing and what may be animated. Moved from `.claude/rules/ui-style.md`. Moved verbatim on 4 Nov 2026; each source file keeps a stub with the headline rule.

---

### Motion Standard — timing, easing, and what may be animated

Applies to every transition and `@keyframes` in `css/styles.css` and every inline Tailwind transition. The reference skill is `.claude/skills/emil-design-eng/` (on-demand — invoke it for a deeper animation review; it is not auto-loaded).

**Duration — match the distance travelled.** A small thing moving a short way should be quick; only a full-width panel earns the long end.

| Element | Duration |
|---------|----------|
| Button press / tap feedback | 100–160 ms |
| Contextual tip, small popover | 125–200 ms |
| Dropdown, pill group, inline reveal | 150–250 ms |
| Decision modal, data slide-up overlay | 200–500 ms |
| Stagger between list items | 30–80 ms |

**Hard ceiling: 300 ms** for anything that is not a full overlay. Past that a phone UI feels laggy rather than smooth. The Stack's overlays (`settings-slide-up`) are the documented exception at up to 500 ms.

**A second, narrow exception: a blocking choreography beat.** A sequenced animation the player cannot act through — where the duration itself *is* the pacing budget, not decoration on an already-actionable UI — may exceed 300 ms, provided it still animates only `transform`/`opacity`. The ceiling protects ordinary chrome feedback (button press, pill toggle), where input is available the whole time. Reference: CJAR's flip/hold/payout beat (`CJAR_FLIP_ANIM_MS`, `js/games/cjar.js`), 3200 ms because no decision can be made until the card's outcome is seen.

**Easing — pick by what the element is doing, not by taste:**
- Entering or exiting the screen → `ease-out`
- Moving around on-screen → `ease-in-out`
- Hover / colour change → `ease`
- Continuous motion (a spinner, a timer sweep) → `linear`
- **Never `ease-in` for UI.** It starts slow and reads as unresponsive — the tap feels dropped.

**Only animate `transform` and `opacity`.** Both are GPU-composited; anything else (width, height, top/left, margin, padding) triggers layout on every frame and janks on a mid-range phone — which is most of this suite's audience.
- Never scale from `scale(0)` — it pops. Use `scale(0.95)` plus an opacity fade.
- Use `translateY(100%)` to move an element by its own height rather than a hardcoded pixel value.
- Tap feedback is `transform: scale(0.97)` on `:active` — this is what `active:scale-95` already gives us across the suite.

**`transition-all` is known debt — do not add more.** It animates *every* animatable property including layout ones, so it is the transform-only rule's blind spot. The ~487 existing uses in `index.html` are left alone (a sweep there is off-limits — see the encoding warning). For new markup name the property: `transition-transform`, `transition-opacity`, `transition-colors`.

**Reduced motion is mandatory and already global.** `css/styles.css` ends with a `@media (prefers-reduced-motion: reduce)` block collapsing every duration to `0.01ms`. Two rules follow from *how* it is written:
- It sets `animation-duration`/`transition-duration` to near-zero — **never `animation: none`**. `js/games/li5.js` has four `animationend` listeners doing the *cleanup*; killing the animation outright means the event never fires and the class and its text stay stranded on screen. New `animationend`-driven cleanup inherits this protection — but only while the block stays duration-based.
- Because it is global, a new **CSS** animation needs no per-feature handling. Do not add a second `prefers-reduced-motion` block.
- **⚠️ A `requestAnimationFrame` loop is the exception, and it is invisible.** The block zeroes CSS `animation-duration`/`transition-duration` — it reaches nothing about a loop writing `transform` by hand, which keeps travelling at full speed with the setting on and no error anywhere. Any RAF animation must check `prefers-reduced-motion` **itself**, in JS, and honour what the standard actually asks: *nothing travels*. Show the end state and skip the journey — do not simply drop the feature, or reduced motion becomes reduced information. Reference: `combReducedMotion()` in `js/games/comb.js` (the Sun Compass still appears and still reveals its number; it just never moves). The one place a per-feature check is required rather than forbidden.

**Test it:** DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`, then exercise the animation. Nothing should travel, and nothing should be left behind.
