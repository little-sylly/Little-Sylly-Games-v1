# Per-Game Class Strings — Little Sylly Games

**On-demand — NOT auto-loaded.** Split out of `.claude/rules/ui-style.md` on 19 Aug 2026 because it
is pure per-game lookup: ~2.3k tokens every session paid, including the many that touch no UI. The
rules that *use* these values stay in `ui-style.md`; only the values live here.

**Read when:** building or editing any game's UI and you need its exact class strings. For brand
colour + active pill alone, `CLAUDE.md` § Per-Game Quick Index already lists all 20 games and is
always loaded — come here for the range/toggle/CTA/label/tint strings it doesn't carry.

**Adding a game = three rows** (one per table). Notes stay with their own rules in `ui-style.md`.

**Changing any brand colour (recolour, or a new game) = also update `GAME_BRAND_HEX` in `js/engine.js`.**
The Secret Mode lobby's Colour sort is computed from that table (hue → HSL walk, `LOBBY_COLOUR_ORDER`
in `engine.js`), not from Table A directly — the two are separate copies of the same fact because the
colour itself lives scattered across Tailwind class NAMES for several games (no single queryable hex
exists anywhere else). Forgetting this update doesn't break anything visibly; Colour mode just quietly
places the game at its old position. There is no harness for this — check it by eye.

---

### Table A — Brand colour and the four themed classes

| Game | Brand colour | Range (`updateSliderTheme`) | Toggle ON (`getMuteToggleOnClass`) | Active pill |
|------|-------------|------------------------------|-------------------------------------|-------------|
| None / lobby | neutral stone | `stone-range` | `game-toggle-on-stone` | — |
| LI5 | pink-500 | `li5-range` | `game-toggle-on-pink` | `pill-active-pink` |
| GM | violet-500 CTAs / purple-* pills | `sylly-range` | `game-toggle-on-purple` | `pill-active-purple` |
| SS | teal-500 | `ss-range` | `game-toggle-on-teal` | `pill-active-teal` |
| JEC | slate-600 (steel, custom) | `jec-range` | `game-toggle-on-slate` | `pill-active-slate` |
| YGI | amber-500 | `ygi-range` | `game-toggle-on-amber` | `pill-active-amber` |
| LTTP | red-500 | `lttp-range` | `game-toggle-on-red` | `pill-active-red` |
| NAT | lime-600 | `nat-range` | `game-toggle-on-lime` | `pill-active-lime` |
| DSD | cyan-700 | `dsd-range` | `game-toggle-on-cyan` | `pill-active-cyan` |
| GTH | `#B1BCA0` sage (custom) | `gth-range` | `game-toggle-on-sage` | `pill-active-sage` |
| DYB | `#6B5744` warm rock-grey (custom) | `dyb-range` | `game-toggle-on-dyb` | `pill-active-dyb` |
| BLD | `#991b1b` dark red (red-800, custom) | `bld-range` | `game-toggle-on-bld` | `pill-active-bld` |
| PASS | zinc-900 | `pass-range` | `game-toggle-on-zinc` | `pill-active-zinc` |
| NT | emerald-500 | `nt-range` | `game-toggle-on-emerald` | `pill-active-emerald` |
| FRT | `#FFE500` electric lemon (custom) | `frt-range` | `game-toggle-on-frt` | `pill-active-frt` |
| SHP | `#3A3D52` midnight (custom) | `shp-range` | `game-toggle-on-shp` | `pill-active-shp` |
| FLW | `#E879A8` rose-pink (custom) | `flw-range` | `game-toggle-on-flw` | `pill-active-flw` |
| PKO | `#9A3412` rust-orange (custom) | `pko-range` | `game-toggle-on-pko` | `pill-active-pko` |
| CJAR | `#5C3A21` chocolate-brown (custom) | `cjar-range` | `game-toggle-on-cjar` | `pill-active-cjar` |
| CLD | `#8ECAE6` glacier blue (custom) | `cld-range` | `game-toggle-on-cld` | `pill-active-cld` |
| COMB | `#F0A500` bright honey gold (custom) | `comb-range` | `game-toggle-on-comb` | `pill-active-comb` |

`sylly-range` is GM's alone — it predates the `[abbr]-range` convention every other game follows. Never reuse it.
Gradient values live on each `.[abbr]-range` rule in `css/styles.css`.

**5 Sep 2026 recolour — five games, prompted by the new "sort by colour" Secret Mode view making
close neighbours visible.** PKO moved off `#854D0E` (brown) to a more orange `#9A3412` so it reads
distinctly from CJAR's new chocolate; YGI took over the amber-500 slot JEC vacated (a warm
"light-bulb" yellow, deliberately apart from FRT's cooler electric-lemon `#FFE500`); JEC moved to
`slate-600` (steel/cutlery) rather than a true neutral grey, so it doesn't blend into the app's own
`stone-700` chrome; CJAR moved off honey-gold `#D4A017` to chocolate-brown `#5C3A21` — this is what
actually resolves the CJAR/COMB honey-gold clash, and COMB (`#F0A500`) needed no change as a result;
DYB moved off ocean blue `#1E4D8C` to a warm rock/clay grey `#6B5744` (rocks on a bluff; bluffing as
a "grey zone"), chosen warmer/more saturated than a flat neutral so it still reads as DYB's colour
next to the lobby's neutral-stone default. SS's teal-500 was reconsidered and kept. Two ink-colour
consequences: YGI's new amber-500 measures ~2.1:1 with white (below the 3:1 floor) so it takes
`ctaTextClass: 'text-stone-800'` like CJAR/FRT/COMB; CJAR's new chocolate is dark enough (~10:1
with white) that it DROPPED that requirement and now takes plain white ink.

### Table B — Game-voiced strings

| Game | Play CTA (menu) | How-to emoji | Sylly Mode name |
|------|-----------------|--------------|-----------------|
| LI5 | Play Time! | 💬 | Extra Credit |
| GM | Begin Link | 🧠 | Static Interference |
| SS | Start Mission | 📡 | Intel Phase |
| JEC | Let's Cook! | 🍳 | Fusion Cuisine |
| YGI | Let's Get To It! | 💡 | The Ringer |
| LTTP | Find The Location! | 🏃‍♂️ | The Troublemaker † |
| NAT | Begin Observation | 🦁 | Survival of the Fittest |
| DSD | Begin Deployment | ⚓ | Silent Running |
| GTH | Start the Session | 🛋️ | Stroke or Genius |
| DYB | Let's Play! | 🎲 | The Tempest |
| BLD | Make the Plans | 📋 | Drama Mode |
| PASS | Deal Me In | 🃏 | The Abyss |
| NT | Initialise System | 💻 | Devil's Network Protocol |
| FRT | Start Serving | 🍌 | Fruity Personalities |
| SHP | Lights Out | 🐑 | Night Terrors |
| FLW | Enter the Exhibition | 💎 | The Counterfeit Run |
| PKO | Enter the Wild | 🐘 | Force of Nature |
| CJAR | Raid the Jar! | 🍪 | Dibber Dobber |
| CLD | Hit the Ice | 🐧 | The Thaw |
| COMB | Send the Scouts | 🐝 | **None** ‖ |

**†  Resolved 1 Aug 2026 — LTTP's Sylly Mode is real and shipped.** The How-to Standard's old parenthetical
("omit for LTTP which has none") was wrong and has been corrected. Verified in code: `lttpJokerMode`, the
`The Troublemaker` role with 2 decoys, and three-way scoring (`lttp.js`; settings + how-to cards in `index.html`).
**Every game in Table B except COMB has a Sylly Mode.**

**‖ Honeycomb Hills is the suite's first game with no Sylly Mode, and that is a decision rather
than an omission** (tech spec §12 / §17-1, carried on its stated default as §16 Q-A). `ui-style.md`
requires a `✨ Sylly Mode` card in both the settings overlay and How to Play; COMB **omits the
settings card entirely** and carries **one honest line** as How to Play's last card ("Not this one").
A dead toggle would be worse — the dim treatment already means *unavailable* on that exact screen
(§ Mutually-exclusive / superseded settings), so a disabled Sylly toggle would read as a setting
the player had locked themselves out of. Do **not** "fix" this by adding a card. The design note
for a future one is carried in `docs/game-identities/comb.md`.

**SW v216 emoji corrections (30 Aug 2026).** Three games' how-to-emoji column changed to match
what the game already shows elsewhere: **YGI 🃏→💡** (its menu hero and `House Rules 💡` settings
title were already 💡; the how-to title alone lagged — 🃏 stays only on the in-game card labels
*The Lineup* / *The Ringer*), **NT ⚡→💻** (menu hero + how-to + lobby badge; the `SYS.CONFIG ⚡`
settings title deliberately keeps ⚡ as a terminal-theme flourish), and **BLD** — the menu hero was
💬, now 📋, matching the how-to (its `Bailed 💬` settings title keeps 💬). `shared-implementation-notes` DD-10.

### Table C — Brand class strings

The how-to **close button is always the game's `accentBtnClass`**, so it no longer has its own column. The
**step label** does keep one — it is usually the -500 shade where `accentTextClass` is -600.

| Game | `accentBtnClass` (= how-to close) | `accentTextClass` | How-to step label | Settings button (light tint) |
|------|-----------------------------------|-------------------|-------------------|------------------------------|
| LI5 | `bg-pink-500 hover:bg-pink-600` | `text-pink-600` | `text-pink-500` | `bg-pink-100 hover:bg-pink-200 text-pink-700` |
| GM | `bg-purple-500 hover:bg-purple-600` | `text-purple-600` | `text-purple-500` | `bg-purple-100 hover:bg-purple-200 text-purple-700` |
| SS | `bg-teal-500 hover:bg-teal-600` | `text-teal-600` | `text-teal-500` | `bg-teal-100 hover:bg-teal-200 text-teal-700` |
| JEC | `bg-slate-600 hover:bg-slate-700` | `text-slate-700` | `text-slate-600` | `bg-slate-100 hover:bg-slate-200 text-slate-700` |
| YGI | `bg-amber-500 hover:bg-amber-600` § | `text-amber-600` | `text-amber-500` | `bg-amber-100 hover:bg-amber-200 text-amber-700` |
| LTTP | `bg-red-500 hover:bg-red-600` | `text-red-600` | `text-red-500` | `bg-red-100 hover:bg-red-200 text-red-700` |
| NAT | `bg-lime-600 hover:bg-lime-700` | `text-lime-700` | `text-lime-600` | `bg-lime-100 hover:bg-lime-200 text-lime-700` |
| DSD | `bg-cyan-700 hover:bg-cyan-800` | `text-cyan-700` | `text-cyan-700` | `bg-cyan-100 hover:bg-cyan-200 text-cyan-700` |
| GTH | inline `style="background-color:#B1BCA0"` | — | inline `style="color:#B1BCA0"` | inline `style="background-color:#e8ede3;color:#6b7a5f"` |
| DYB | `dyb-cta` | `dyb-label` | `dyb-label` | `bg-[#e8e1d8] hover:bg-[#ddd4c4] text-[#6B5744]` |
| BLD | `bld-cta` | `bld-label` | `bld-label` | `bg-red-100 hover:bg-red-200 text-red-700` |
| PASS | `bg-zinc-900 hover:bg-zinc-800` | `text-zinc-900` | `text-zinc-700` | `bg-zinc-100 hover:bg-zinc-200 text-zinc-700` |
| NT | `bg-emerald-500 hover:bg-emerald-600` | `text-emerald-600` | `text-emerald-600` | `bg-emerald-100 hover:bg-emerald-200 text-emerald-700` |
| FRT | inline `style="background:#FFE500"` § | inline `text-[#047857]` | inline `style="color:#047857"` | `bg-[#FFF4CC] hover:bg-[#FFF3A6] text-[#854d0e]` |
| SHP | `shp-cta` | — | `shp-label` | `bg-[#E6E7EE] hover:bg-[#C9CBDA] text-[#3A3D52]` |
| FLW | `flw-cta` | — | `flw-step-label` | `bg-[#A02050] hover:bg-[#7A1A3E] text-white` ¶ |
| PKO | `pko-cta` | — | `pko-label` | `bg-[#F5E6C8] hover:bg-[#EBD5A8] text-[#9A3412]` |
| CJAR | `cjar-cta` | — | `cjar-label` | `bg-[#F7E9C4] hover:bg-[#EFDCA8] text-[#5C3A21]` |
| CLD | `cld-cta` | — | `cld-label` | `bg-[#e4f4fa] hover:bg-[#cbe9f4] text-[#2a6b85]` |
| COMB | `comb-cta` ※ | — | `comb-label` | `bg-[#FDF0D0] hover:bg-[#FAE3AB] text-[#B87A00]` |


**CJAR no longer needs a dark-ink exception.** Its 5 Sep 2026 recolour to chocolate-brown `#5C3A21`
measures ~10:1 with white, so `.cjar-cta` takes plain white ink like most of the suite — this
footnote used to document a `#D4A017`-era requirement that no longer applies. Modal border
`border-[#E5C97A]` (unchanged — the card-face biscuit palette wasn't touched by the recolour).

**§ YGI's CTA/pill/toggle take dark ink, never white** — added 5 Sep 2026 when YGI moved to
amber-500 (`#f59e0b` measures ~2.1:1 against white, below the 3:1 floor; `#292524` measures ~7:1).
`MP_GAME_CONFIGS` sets `ctaTextClass: 'text-stone-800'`. Unlike CJAR/PKO/DYB, YGI has no custom
`.ygi-cta` class — every static button in `index.html` carries `text-stone-800` directly instead of
`text-white`. **The lobby tile is the one exception**, per the established FRT/CJAR/CLD/COMB
pattern: `#btn-ygi` keeps `text-white`, because `.gel-btn`'s dark base gradient plus
`.lobby-btn-label`'s text-shadow carry white fine there even though the flat in-game fill can't.
FRT's how-to close button is the same dark-ink case — `bg-[#FFE500] hover:bg-[#E6D200]
text-stone-800`, same colour as utilities.

**¶ FLW's Settings/Audit/readyCheck buttons deliberately invert the light-tint convention** —
`#A02050` fill + white text instead of the usual `bg-[brand-100] text-[brand-700]` pastel. The
primary CTA/pills/toggle-ON (and the lobby's `#btn-flw` tile) are `#F9A8D4` fill + white text.
Measured contrast is low (~1.8:1) — a deliberate, owner-confirmed call, **not** an oversight to
"fix", and **not** to be generalised to other games' Settings buttons.

A `—` in the `accentTextClass` column means the game never calls `showWhoFirst()` (GTH, FLW, PKO,
SHP, CJAR, CLD, COMB). Don't invent one.

**※ COMB takes dark ink**, the third custom-hex CTA to do so after CJAR `#D4A017` and FRT `#FFE500`,
and for the same measured reason: white on `#F0A500` is **1.94:1**, `#292524` on it is **7.28:1**.
`.comb-cta` supplies `color:#292524` itself — never add a Tailwind `text-white` alongside it, and
`MP_GAME_CONFIGS` sets `ctaTextClass: 'text-stone-800'` so the mode screen agrees. `#btn-comb`
overrides to white for the lobby keycap alone, where `.gel-btn`'s dark base gradient carries it.
Labels take the darkened `#B87A00` (raw `#F0A500` on `bg-stone-50` is ~2.0:1). Modal border
`border-[#F5C55C]`. **Measured caveat:** `#B87A00` is **3.45:1**, short of 4.5:1 for small text and
the weakest of the three darkened-label pairs (CJAR 5.99:1, CLD 5.68:1). Shipped as tech spec §1
states it; `#9A6600` measures 4.70:1 on the same ground if the owner wants it lifted.

**CLD takes dark ink** (`.cld-cta` → `color:#123B4C`, deep glacier — corrected 8 Sep 2026; this
entry previously claimed white ink plus a text-shadow, which was never what the shipped CSS did).
**The one exception is `#btn-cld-menu-play`**, ID-overridden to white — owner-confirmed by eye —
because that button alone carries `.gel-btn`'s dark base gradient, the same mechanism that lets the
lobby tile (`#btn-cld`) use white on the same flat fill. Every other `.cld-cta` use (Lock It In, Got
it, quit confirm, etc.) has no gel treatment and keeps dark ink. `#btn-comb-menu-play` got the
identical menu-only override the same day, for the same reason. Modal border `border-[#b8dfec]`.

Rationale behind the ‡ § ¶ exceptions: `docs/decision-log.md` 2026-08-02 (BLD/FRT recoloured off
yellow, with the measured contrast figures) and 2026-08-15 (FLW). FLW's six-pass settlement is
`docs/sw-changelog.md` v189 and `docs/implementation-notes/flw-implementation-notes.md`.
